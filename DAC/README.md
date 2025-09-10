# ArchCode

Official implementation of the paper "ArchCode: Incorporating Software Requirements in Code Generation with Large Language Models, ACL 2024".

# 1. How to run it

## 1) prepare python virtual environment

```bash
conda create -n ArchCode python=3.10
conda activate ArchCode
pip install -r requirements.txt
```

## 2) run third party packages

### i. install `expand_langchain`

```bash
git submodule update --init --recursive
pip install -e third_party/expand_langchain
```

### ii. run `CodeExecContainer`

At a new terminal, run the following command and keep it running.

```bash
source third_party/CodeExecContainer/run.sh
```

### iii. run Ollama (for local llm generation)

refer to [Ollama](https://github.com/ollama/ollama) for more information.

```bash
docker run -d \
  -v ollama:/root/.ollama \
  -p 11434:11434 \
  --name ollama \
  ollama/ollama
docker exec -d ollama ollama pull ollama/llama3:8b-instruct-fp16
```

## 3) save API keys

1. In root directory, copy `api_keys_example.json` to `api_keys.json`.
2. set your API keys in the file.

## 4) run python script

refer to [Python Fire](https://google.github.io/python-fire/guide/) for arguments setting.

### i. generation

```bash
python run.py generator \
    --config_path=configs/llama3_8b-vanilla-fr.yaml \
    - run \
    - merge_json \
    - exit
```

### ii. evaluation

```bash
python run.py evaluator \
    --path=results/llama3_8b-archcode-fr/results_merged_1.json \
    --gt_key=passed \
    --filter_keys=[gen_tc_passed] \
    --filter_weights=[1] \
    - run \
    --k=[1,2,5,10] \
    --n=10
```

### iii. server

```bash
python run.py server \
    - run \
    --port=8080
```

The API server has the following endpoints:

- `/generate`: POST request with a json body containing the following fields:
  - nl_query: str
  - llm_kwargs: dict
    - model_name: str = "gpt-4o-mini"
    - platform: str = "openai"
    - greedy_kwargs: dict
      - temperature: float = 0.0
      - top_p: float = 1.0
      - max_tokens: int = 2048
    - nucleus_kwargs: dict
      - temperature: float = 0.8
      - top_p: float = 1.0
      - max_tokens: int = 2048
  - candidate_num: int = 10

If you want to generate code for a given natural language query, you can send a POST request to the `/generate` endpoint with the following body:

```json
{
  "nl_query": "Get the sum of two numbers",
  "llm_kwargs": {
    "model_name": "gpt-4o-mini",
    "platform": "openai",
    "greedy_kwargs": {
      "temperature": 0.0,
      "top_p": 1.0,
      "max_tokens": 2048
    },
    "nucleus_kwargs": {
      "temperature": 0.8,
      "top_p": 1.0,
      "max_tokens": 2048
    }
  },
  "candidate_num": 10
}
```

If you want to generate code using only function calls, use generate function

```bash
python run.py server \
    - generate \
    --nl_query="Get the sum of two numbers" \
    --llm_kwargs='{"model_name": "gpt-4o-mini", "platform": "openai", "greedy_kwargs": {"temperature": 0.0, "top_p": 1.0, "max_tokens": 2048}, "nucleus_kwargs": {"temperature": 0.8, "top_p": 1.0, "max_tokens": 2048}}' \
    --candidate_num=10
```

## 2. Configs

Configurations are stored as YAML files in the `configs` directory. Each config file generally contains three main sections:

1. **source**
2. **dataset**
3. **graph**

Below is a detailed explanation of each section.

---

### 1) Source

The **source** section describes how to obtain the original data before it is processed into a usable dataset. It usually has the following fields:

- **i. name**  
  The name of the source.

- **ii. type**  
  The type of the source. Common values are `huggingface`, `json`, `jsonl`, or `yaml`.

- **iii. kwargs**  
  Additional details needed to load the data based on the `type`.

  **For `huggingface` type**, the following `kwargs` are typical:

  - **path**: The path (identifier) of the Hugging Face dataset.
  - **sort_key**: The key used to sort the dataset.
  - **split**: Specifies which split to load (e.g. `train`, `test`, `valid`).
  - **load_dataset_kwargs**: Additional arguments passed to the `load_dataset` function.

  **For `json`, `jsonl`, or `yaml` type**, the following `kwargs` are typical:

  - **path**: The file path to the `.json`, `.jsonl`, or `.yaml` file.
  - **sort_key**: The key used to sort the dataset.

---

### 2) Dataset

The **dataset** section describes how data from the **source** is transformed into a final list of dictionaries (i.e., the processed dataset). Each dictionary in this list will contain the fields defined in the `fields` sub-section.

- **i. name**  
  The name of the dataset.

  - If `name` is `target`, it indicates the main dataset to be used for generation or tasks.
  - If `name` is `example`, it indicates a few-shot example dataset to support generation tasks.

- **ii. primary_key**  
  The field (defined in `fields`) that will act as the primary key.

- **iii. fields**  
  Defines which data fields should appear in each dictionary of the resulting dataset. Each field in this list has:

  1. **name**  
     The name of the field in the final dataset.
  2. **source**  
     Which source (from the `source` section) provides the data for this field.
  3. **key**  
     The specific key or attribute in the source that maps to this field.

---

### 3) Graph

The **graph** section uses the [Langgraph](https://langchain-ai.github.io/langgraph/) library to define the LLM workflow. It describes how different nodes (and their chains) connect and in what order they execute.

- **i. entry_point**  
  The name of the node where the workflow starts.

- **ii. edges**  
  A list of edges defining connections between nodes. Each edge has:

  1. **pair**: Names of the two nodes being connected.
  2. **type**: The type of edge. In this repository, we primarily use `always`, meaning the second node always executes after the first.

- **iii. nodes**  
  A list of node definitions, where each node can contain one or more chains. Each node has:

  1. **name**  
     The name of the node.
  2. **chains**  
     A list of chains that make up this node. Each chain typically has:

     1. **name**  
        The name of the chain.
     2. **dependencies**  
        A list of chain names that must run before this chain.
     3. **input_keys**  
        The input keys required for execution.
     4. **type & kwargs**  
        The chain’s type and any additional parameters. Common chain types:

        - **cot** (Chain of Thought): For LLM text generation.

          - **n**: Number of thoughts (generations) to produce.
          - **llm**: Which language model to use.
          - **parsers**: How to parse generated code or text. Each parser has:
            - **type**: The parser type.
            - **kwargs**: Additional arguments for the parser.
          - **prompt**: The prompt specification. Usually:
            - **type**: For example, `chat` (for chat-based prompts).
            - **kwargs**: Additional settings, templates, or variables for the prompt.

        - **execute**  
          Executes generated code or commands.

        - **custom_lambda**  
          Runs a user-defined custom function (lambda).

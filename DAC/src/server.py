import json
import os
from copy import deepcopy

from langchain_core.documents import Document

from expand_langchain.config import Config
from expand_langchain.generator import Generator
from pydantic import BaseModel
from quart import Quart, Response, jsonify, request
from quart_cors import cors


app = Quart(__name__)
app = cors(app, allow_origin="*") # Allows all origins for simplicity, adjust as needed



DEFAULT_LLM_KWARGS = {
    "model_name": "gpt-4o-mini",
    "platform": "openai",
    "greedy_kwargs": {
        "temperature": 0.0,
        "top_p": 1.0,
        "max_tokens": 2048,
    },
    "nucleus_kwargs": {
        "temperature": 0.8,
        "top_p": 1.0,
        "max_tokens": 2048,
    },
}


class Server(BaseModel):
    verbose: bool = False
    default_config_path: str = "configs/user_input.yaml"
    api_keys_path: str = "api_keys.json"

    # private variables
    _default_config: Config = None
    _generator: Generator = None

    def __init__(self, **data):
        super().__init__(**data)

        self._default_config = Config(path=self.default_config_path)

    async def run(
        self,
        port: int,
    ):
        """
        Run the api server with Flask.
        The API server should have the following endpoints:
        - /generate: streams the generated results to the client.
            - nl_query: str
            - llm_kwargs: dict = {
                - model_name: str = "gpt-4o-mini"
                - platform: str = "openai"
                - greedy_kwargs: dict = {
                    - temperature: float = 0.0
                    - top_p: float = 1.0
                    - max_tokens: int = 2048
                }
                - nucleus_kwargs: dict = {
                    - temperature: float = 0.8
                    - top_p: float = 1.0
                    - max_tokens: int = 2048
                }
              }
            - candidate_num: int = 10
        """

        """
        Example response: Streaming
        {"requirements_raw": [str], "requirements": [str]}
        {"plan_raw": [str], "plan": [str]}
        {"gen_tc_raw": [str], "gen_tc": {
                                                    "fr": "",
                                                    "general": "",
                                                    "edge": "",
                                                    "nfr": "",
                                                    "performance": "",
                                                    "sqr": "",
                                                    "robustness": "",
                                                    "maintainability": ""
                                                }}
        {"code_raw": [str], "code": [str]}
        {"gen_tc_exec_code": [[str]]}
        {"gen_tc_exec_result": [[str]]} # "Exit Code: 0\n"
        {"gen_tc_passed": [[bool]]}

        """

        @app.route("/health", methods=["GET"])
        def health_check():
            return {"ok": True}


        @app.route("/generate", methods=["POST"])
        async def generate():
            data = await request.get_json()
            nl_query = data["nl_query"]
            llm_kwargs = data.get("llm_kwargs", DEFAULT_LLM_KWARGS)
            candidate_num = data.get("candidate_num", 10)
            api_key = data.get("api_key", None)

            async def _generate():
                config = self._update_config(
                    candidate_num=candidate_num, llm_kwargs=llm_kwargs
                )
                if self._generator is None or self._generator.config != config:
                    self._generator = Generator(
                        config=config,
                        do_save=False,
                        run_name="user_input",
                    )

                gen = self._generator.astream_user_input(
                    nl_query=nl_query,
                    nl_query_key="problem",
                    event_names=[
                        "code_plan",
                        "pseudocodes",
                        "retrieval_identifications",
                        "retrieval_queries",
                        "retrieval_queries_target",
                        "retrieved_codes",
                        "retrieved_codes_without_backticks",
                        "retrieved_codes_with_backticks",
                        "code",
                    ],
                )

                async for result in gen:
                    try:
                        yield json.dumps(result) + "\n"
                    except Exception as e:
                        if "retrieved_codes" in result:
                            yield json.dumps({})
                            # retrieved_codes = [
                            #     str(doc) for doc in result["retrieved_codes"]
                            # ]
                            # result["retrieved_codes"] = retrieved_codes
                            #
                            # yield json.dumps(result) + "\n"

            if api_key:
                os.environ["OPENAI_API_KEY"] = api_key
            else:
                os.environ["OPENAI_API_KEY"] = ""

            return Response(_generate(), content_type="application/json")

        await app.run_task(port=port, host="0.0.0.0")



    def _update_config(self, candidate_num: int, llm_kwargs: dict):
        new_config = deepcopy(self._default_config)

        model_name = llm_kwargs.get("model_name", "gpt-4o-mini")
        platform = llm_kwargs.get("platform", "openai")
        greedy_kwargs = llm_kwargs.get("greedy_kwargs", {})
        nucleus_kwargs = llm_kwargs.get("nucleus_kwargs", {})

        chains = new_config.graph.nodes[0].chains
        for chain in chains:
            if chain.name == "plan":
                chain.kwargs.update(
                    {
                        "n": candidate_num,
                        "llm": {
                            "max_tokens": nucleus_kwargs.get("max_tokens", 2048),
                            "model": model_name,
                            "platform": platform,
                            "temperature": nucleus_kwargs.get("temperature", 0.8),
                            "top_p": nucleus_kwargs.get("top_p", 1.0),
                        },
                    }
                )
            else:
                if chain.type == "cot":
                    chain.kwargs.update(
                        {
                            "llm": {
                                "max_tokens": greedy_kwargs.get("max_tokens", 2048),
                                "model": model_name,
                                "platform": platform,
                                "temperature": greedy_kwargs.get("temperature", 0.0),
                                "top_p": greedy_kwargs.get("top_p", 1.0),
                            }
                        }
                    )

        return new_config

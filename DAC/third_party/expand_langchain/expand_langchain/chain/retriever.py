import itertools
import os
from typing import List

from expand_langchain.utils.registry import chain_registry, model_registry
from langchain_core.runnables import RunnableLambda
from langchain_elasticsearch import ElasticsearchStore
from typing import *

@chain_registry(name="retriever")
def retriever_chain(
    key: str,
    method: str,
    query_key: str,
    index_name: str,
    embedding_model: Dict[str, Any] = {},
    search_kwargs: Dict[str, Any] = {},
    **kwargs,
):
    embedding_model_obj = model_registry["embedding"](**embedding_model)
    if method == "elasticsearch":
        while True:
            try:
                es = ElasticsearchStore(
                    index_name=index_name,
                    embedding=embedding_model_obj,
                    es_url=os.environ["ELASTICSEARCH_URL"],
                    es_api_key=os.environ["ELASTICSEARCH_API_KEY"],
                )
                break
            except Exception as e:
                print("Error connecting to Elasticsearch. Retrying...")
                continue

        retriever = es.as_retriever(
            search_kwargs=search_kwargs,
        )
    def _func(data, config={}):
        result = {}
        result[key] = []

        inputs = data[query_key]
        if isinstance(inputs, str):
            while True:
                try:
                    retrieval_result = retriever.invoke(inputs)
                    break
                except Exception as e:
                    print("Error during retrieval. Retrying...")
                    continue
            result[key].extend(retrieval_result)
        elif isinstance(inputs, List):
            # flatten list
            while type(inputs[0]) is list:
                inputs = list(itertools.chain.from_iterable(inputs))
                inputs = [item for item in inputs if item]
            while True:
                try:
                    retrieval_result = retriever.batch(inputs)
                    break
                except Exception as e:
                    print("Error during retrieval. Retrying...")
                    continue
            flat_retrieval_result = list(itertools.chain.from_iterable(retrieval_result))
            result[key].extend([flat_retrieval_result])
        elif isinstance(input, dict):
            for input in inputs.items():
                while True:
                    try:
                        retrieval_result = retriever.invoke(dict([input]))
                        break
                    except Exception as e:
                        print("Error during retrieval. Retrying...")
                        continue
                result[key].extend(retrieval_result)
        else:
            raise ValueError("Invalid input type")

        return result

    return RunnableLambda(_func, name="retriever")

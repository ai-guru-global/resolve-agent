"""Store client package for accessing Go platform storage APIs.

Provides async HTTP clients for the 7 database stores:
- HookClient: Lifecycle hook management
- RAGDocumentClient: RAG document metadata and ingestion history
- FTADocumentClient: FTA document and analysis result management
- CodeAnalysisClient: Code static analysis runs and findings
- MemoryClient: Short-term and long-term agent memory
- SolutionClient: Troubleshooting solution knowledge base
"""

from resolveagent.store.base_client import BaseStoreClient
from resolveagent.store.code_analysis_client import CodeAnalysisClient
from resolveagent.store.fta_document_client import FTADocumentClient
from resolveagent.store.hook_client import HookClient
from resolveagent.store.memory_client import MemoryClient
from resolveagent.store.rag_document_client import RAGDocumentClient
from resolveagent.store.solution_client import SolutionClient

__all__ = [
    "BaseStoreClient",
    "HookClient",
    "RAGDocumentClient",
    "FTADocumentClient",
    "CodeAnalysisClient",
    "MemoryClient",
    "SolutionClient",
]

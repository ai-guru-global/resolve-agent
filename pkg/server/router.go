package server

import "net/http"

// registerHTTPRoutes sets up REST API routes.
func (s *Server) registerHTTPRoutes(mux *http.ServeMux) {
	// Health check
	mux.HandleFunc("GET /api/v1/health", s.handleHealth)
	mux.HandleFunc("GET /healthz", s.handleHealth)

	// System info
	mux.HandleFunc("GET /api/v1/system/info", s.handleSystemInfo)

	// Agent endpoints
	mux.HandleFunc("GET /api/v1/agents", s.handleListAgents)
	mux.HandleFunc("POST /api/v1/agents", s.handleCreateAgent)
	mux.HandleFunc("GET /api/v1/agents/{id}", s.handleGetAgent)
	mux.HandleFunc("PUT /api/v1/agents/{id}", s.handleUpdateAgent)
	mux.HandleFunc("DELETE /api/v1/agents/{id}", s.handleDeleteAgent)
	mux.HandleFunc("POST /api/v1/agents/{id}/execute", s.handleExecuteAgent)

	// Skill endpoints
	mux.HandleFunc("GET /api/v1/skills", s.handleListSkills)
	mux.HandleFunc("POST /api/v1/skills", s.handleRegisterSkill)
	mux.HandleFunc("GET /api/v1/skills/{name}", s.handleGetSkill)
	mux.HandleFunc("DELETE /api/v1/skills/{name}", s.handleUnregisterSkill)

	// Workflow endpoints
	mux.HandleFunc("GET /api/v1/workflows", s.handleListWorkflows)
	mux.HandleFunc("POST /api/v1/workflows", s.handleCreateWorkflow)
	mux.HandleFunc("GET /api/v1/workflows/{id}", s.handleGetWorkflow)
	mux.HandleFunc("PUT /api/v1/workflows/{id}", s.handleUpdateWorkflow)
	mux.HandleFunc("DELETE /api/v1/workflows/{id}", s.handleDeleteWorkflow)
	mux.HandleFunc("POST /api/v1/workflows/{id}/validate", s.handleValidateWorkflow)
	mux.HandleFunc("POST /api/v1/workflows/{id}/execute", s.handleExecuteWorkflow)

	// RAG endpoints
	mux.HandleFunc("GET /api/v1/rag/collections", s.handleListCollections)
	mux.HandleFunc("POST /api/v1/rag/collections", s.handleCreateCollection)
	mux.HandleFunc("DELETE /api/v1/rag/collections/{id}", s.handleDeleteCollection)
	mux.HandleFunc("POST /api/v1/rag/collections/{id}/ingest", s.handleIngestDocuments)
	mux.HandleFunc("POST /api/v1/rag/collections/{id}/query", s.handleQueryCollection)

	// Model endpoints
	mux.HandleFunc("GET /api/v1/models", s.handleListModels)
	mux.HandleFunc("POST /api/v1/models", s.handleAddModel)

	// Config endpoints
	mux.HandleFunc("GET /api/v1/config", s.handleGetConfig)
	mux.HandleFunc("PUT /api/v1/config", s.handleUpdateConfig)

	// Hook endpoints
	mux.HandleFunc("GET /api/v1/hooks", s.handleListHooks)
	mux.HandleFunc("POST /api/v1/hooks", s.handleCreateHook)
	mux.HandleFunc("GET /api/v1/hooks/{id}", s.handleGetHook)
	mux.HandleFunc("PUT /api/v1/hooks/{id}", s.handleUpdateHook)
	mux.HandleFunc("DELETE /api/v1/hooks/{id}", s.handleDeleteHook)
	mux.HandleFunc("GET /api/v1/hooks/{id}/executions", s.handleListHookExecutions)

	// RAG Document endpoints
	mux.HandleFunc("GET /api/v1/rag/collections/{id}/documents", s.handleListRAGDocuments)
	mux.HandleFunc("POST /api/v1/rag/collections/{id}/documents", s.handleCreateRAGDocument)
	mux.HandleFunc("GET /api/v1/rag/documents/{id}", s.handleGetRAGDocument)
	mux.HandleFunc("PUT /api/v1/rag/documents/{id}", s.handleUpdateRAGDocument)
	mux.HandleFunc("DELETE /api/v1/rag/documents/{id}", s.handleDeleteRAGDocument)
	mux.HandleFunc("GET /api/v1/rag/collections/{id}/ingestions", s.handleListRAGIngestions)

	// FTA Document endpoints
	mux.HandleFunc("GET /api/v1/fta/documents", s.handleListFTADocuments)
	mux.HandleFunc("POST /api/v1/fta/documents", s.handleCreateFTADocument)
	mux.HandleFunc("GET /api/v1/fta/documents/{id}", s.handleGetFTADocument)
	mux.HandleFunc("PUT /api/v1/fta/documents/{id}", s.handleUpdateFTADocument)
	mux.HandleFunc("DELETE /api/v1/fta/documents/{id}", s.handleDeleteFTADocument)
	mux.HandleFunc("GET /api/v1/fta/documents/{id}/results", s.handleListFTAResults)
	mux.HandleFunc("POST /api/v1/fta/documents/{id}/results", s.handleCreateFTAResult)

	// Code Analysis endpoints
	mux.HandleFunc("GET /api/v1/analyses", s.handleListAnalyses)
	mux.HandleFunc("POST /api/v1/analyses", s.handleCreateAnalysis)
	mux.HandleFunc("GET /api/v1/analyses/{id}", s.handleGetAnalysis)
	mux.HandleFunc("PUT /api/v1/analyses/{id}", s.handleUpdateAnalysis)
	mux.HandleFunc("DELETE /api/v1/analyses/{id}", s.handleDeleteAnalysis)
	mux.HandleFunc("GET /api/v1/analyses/{id}/findings", s.handleListFindings)
	mux.HandleFunc("POST /api/v1/analyses/{id}/findings", s.handleAddFindings)

	// Corpus import endpoints
	mux.HandleFunc("POST /api/v1/corpus/import", s.handleCorpusImport)

	// Memory endpoints
	mux.HandleFunc("GET /api/v1/memory/agents/{agent_id}/conversations", s.handleListConversations)
	mux.HandleFunc("GET /api/v1/memory/conversations/{id}", s.handleGetConversation)
	mux.HandleFunc("POST /api/v1/memory/conversations/{id}/messages", s.handleAddMessage)
	mux.HandleFunc("DELETE /api/v1/memory/conversations/{id}", s.handleDeleteConversation)
	mux.HandleFunc("GET /api/v1/memory/agents/{agent_id}/long-term", s.handleSearchLongTermMemory)
	mux.HandleFunc("POST /api/v1/memory/long-term", s.handleStoreLongTermMemory)
	mux.HandleFunc("GET /api/v1/memory/long-term/{id}", s.handleGetLongTermMemory)
	mux.HandleFunc("PUT /api/v1/memory/long-term/{id}", s.handleUpdateLongTermMemory)
	mux.HandleFunc("DELETE /api/v1/memory/long-term/{id}", s.handleDeleteLongTermMemory)
	mux.HandleFunc("POST /api/v1/memory/prune", s.handlePruneMemories)

	// Troubleshooting solution endpoints
	mux.HandleFunc("GET /api/v1/solutions", s.handleListSolutions)
	mux.HandleFunc("POST /api/v1/solutions", s.handleCreateSolution)
	mux.HandleFunc("GET /api/v1/solutions/{id}", s.handleGetSolution)
	mux.HandleFunc("PUT /api/v1/solutions/{id}", s.handleUpdateSolution)
	mux.HandleFunc("DELETE /api/v1/solutions/{id}", s.handleDeleteSolution)
	mux.HandleFunc("POST /api/v1/solutions/search", s.handleSearchSolutions)
	mux.HandleFunc("POST /api/v1/solutions/bulk", s.handleBulkCreateSolutions)
	mux.HandleFunc("GET /api/v1/solutions/{id}/executions", s.handleListSolutionExecutions)
	mux.HandleFunc("POST /api/v1/solutions/{id}/executions", s.handleRecordSolutionExecution)

	// Call Graph endpoints
	mux.HandleFunc("GET /api/v1/call-graphs", s.handleListCallGraphs)
	mux.HandleFunc("POST /api/v1/call-graphs", s.handleCreateCallGraph)
	mux.HandleFunc("GET /api/v1/call-graphs/{id}", s.handleGetCallGraph)
	mux.HandleFunc("DELETE /api/v1/call-graphs/{id}", s.handleDeleteCallGraph)
	mux.HandleFunc("GET /api/v1/call-graphs/{id}/nodes", s.handleListCallGraphNodes)
	mux.HandleFunc("GET /api/v1/call-graphs/{id}/edges", s.handleListCallGraphEdges)
	mux.HandleFunc("GET /api/v1/call-graphs/{id}/subgraph", s.handleGetCallGraphSubgraph)

	// Traffic Capture endpoints
	mux.HandleFunc("GET /api/v1/traffic/captures", s.handleListTrafficCaptures)
	mux.HandleFunc("POST /api/v1/traffic/captures", s.handleCreateTrafficCapture)
	mux.HandleFunc("GET /api/v1/traffic/captures/{id}", s.handleGetTrafficCapture)
	mux.HandleFunc("DELETE /api/v1/traffic/captures/{id}", s.handleDeleteTrafficCapture)
	mux.HandleFunc("POST /api/v1/traffic/captures/{id}/records", s.handleAddTrafficRecords)
	mux.HandleFunc("GET /api/v1/traffic/captures/{id}/records", s.handleListTrafficRecords)

	// Traffic Graph endpoints
	mux.HandleFunc("GET /api/v1/traffic/graphs", s.handleListTrafficGraphs)
	mux.HandleFunc("POST /api/v1/traffic/graphs", s.handleCreateTrafficGraph)
	mux.HandleFunc("GET /api/v1/traffic/graphs/{id}", s.handleGetTrafficGraph)
	mux.HandleFunc("PUT /api/v1/traffic/graphs/{id}", s.handleUpdateTrafficGraph)
	mux.HandleFunc("DELETE /api/v1/traffic/graphs/{id}", s.handleDeleteTrafficGraph)
	mux.HandleFunc("POST /api/v1/traffic/graphs/{id}/analyze", s.handleAnalyzeTrafficGraph)
}

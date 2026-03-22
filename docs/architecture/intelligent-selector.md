# Intelligent Selector

The Intelligent Selector is the LLM-powered meta-router at the heart of ResolveNet.

## Routing Strategies

1. **Rule-based**: Pattern matching for known request types
2. **LLM-based**: Uses a fast LLM for ambiguous request classification
3. **Hybrid** (default): Rules first, LLM fallback

## Route Types

- `fta`: Fault Tree Analysis workflow
- `skill`: Agent skill execution
- `rag`: Retrieval-Augmented Generation
- `multi`: Chained execution
- `direct`: Direct LLM response

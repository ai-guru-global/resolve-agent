# FTA Workflow Engine

The Fault Tree Analysis engine executes structured decision trees.

## Concepts

- **Fault Tree**: A DAG of events connected by logical gates
- **Basic Events**: Leaf nodes evaluated by skills, RAG, or LLM
- **Gates**: AND, OR, VOTING (k-of-n), INHIBIT, PRIORITY-AND
- **Cut Sets**: Minimal combinations causing the top event

## Evaluation Process

1. Parse tree definition
2. Identify leaf events
3. Evaluate leaves (may invoke skills/RAG/LLM)
4. Propagate through gates bottom-up
5. Compute top event result

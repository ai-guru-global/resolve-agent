# ResolveAgent Dify Plugin

Dify plugin that exposes ResolveAgent's diagnostic capabilities as Dify tools.

## Features

- **FTA Analyzer**: Fault Tree Analysis for root cause identification
- **Code Diagnosis**: Multi-language static analysis (Python, Java, Go, Rust)

## Installation

1. Install the Dify plugin SDK:
   ```bash
   pip install dify-plugin
   ```

2. Configure environment variables:
   ```bash
   export RESOLVEAGENT_ENDPOINT=http://localhost:8080
   export RESOLVEAGENT_API_KEY=your-api-key
   ```

3. Package and install the plugin in Dify:
   ```bash
   cd integrations/dify/resolveagent-dify
   dify-plugin package
   # Upload the generated .difypkg file to Dify
   ```

## Tools

### FTA Analyzer

Analyzes system incidents using Fault Tree Analysis to identify root causes.

**Parameters:**
- `incident_description` (required): Description of the incident
- `system_context` (optional): System architecture context
- `evaluation_mode` (optional): `parallel` (fast) or `sequential` (standard)

### Code Diagnosis

Performs static code analysis to find bugs, performance, and security issues.

**Parameters:**
- `code_snippet` (required): Source code to analyze
- `language` (required): Programming language (`python`, `java`, `go`, `rust`)
- `diagnosis_type` (optional): `general`, `performance`, or `security`

## Architecture

```
resolveagent-dify/
├── manifest.yaml           # Plugin metadata
├── requirements.txt        # Python dependencies
├── provider/
│   ├── resolveagent-dify.yaml
│   └── resolveagent-dify.py
└── tools/
    ├── fta_analyzer.yaml
    ├── fta_analyzer.py
    ├── code_diagnosis.yaml
    └── code_diagnosis.py
```

## Fallback Behavior

If the ResolveAgent backend is not available, tools fall back to local analysis:
- FTA Analyzer: Builds a simple fault tree and evaluates it locally
- Code Diagnosis: Uses ResolveAgent's parser factory for AST analysis

## Development

Run tests:
```bash
cd ../../python
uv run pytest tests/test_dify_plugin.py -v
```

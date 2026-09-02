"""Tests for Dify plugin tools."""

from __future__ import annotations

from resolveagent.integrations.dify.tools import CodeDiagnosisTool, FTAAnalyzerTool


class TestFTAAnalyzerTool:
    """Tests for FTA analyzer tool."""

    def test_invoke_with_description(self):
        """Test FTA analysis with incident description."""
        tool = FTAAnalyzerTool()
        result = tool.invoke(
            {
                "incident_description": "Database connection timeout error",
                "system_context": "MySQL backend",
                "evaluation_mode": "parallel",
            }
        )

        assert "FTA Analysis Result" in result
        assert "timeout" in result.lower()

    def test_invoke_missing_description(self):
        """Test FTA analysis without required description."""
        tool = FTAAnalyzerTool()
        result = tool.invoke({})

        assert "Error" in result


class TestCodeDiagnosisTool:
    """Tests for code diagnosis tool."""

    def test_invoke_with_code(self):
        """Test code diagnosis with valid input."""
        tool = CodeDiagnosisTool()
        code = "def hello():\n    print('hello')\n"
        result = tool.invoke(
            {
                "code_snippet": code,
                "language": "python",
                "diagnosis_type": "general",
            }
        )

        assert "Code Diagnosis Result" in result
        assert "python" in result.lower()

    def test_invoke_missing_code(self):
        """Test code diagnosis without required code."""
        tool = CodeDiagnosisTool()
        result = tool.invoke({})

        assert "Error" in result

    def test_security_detection(self):
        """Test security issue detection."""
        tool = CodeDiagnosisTool()
        code = "password = 'secret123'\n"
        result = tool.invoke(
            {
                "code_snippet": code,
                "language": "python",
                "diagnosis_type": "security",
            }
        )

        assert "Security" in result or "No obvious" in result

    def test_performance_detection(self):
        """Test performance issue detection."""
        tool = CodeDiagnosisTool()
        code = "for i in range(10):\n    for j in range(10):\n        for k in range(10):\n            pass\n"
        result = tool.invoke(
            {
                "code_snippet": code,
                "language": "python",
                "diagnosis_type": "performance",
            }
        )

        assert "Performance" in result or "No obvious" in result

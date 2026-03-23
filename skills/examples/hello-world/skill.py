"""Hello World skill - a simple example."""


def run(name: str = "World") -> dict[str, str]:
    """Generate a greeting.

    Args:
        name: Name to greet.

    Returns:
        Dict with greeting message.
    """
    return {"greeting": f"Hello, {name}! Welcome to ResolveAgent."}

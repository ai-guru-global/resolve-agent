"""ResolveAgent gRPC API Client Stubs.

This package contains auto-generated gRPC client stubs for communicating
with the Go platform services. The stubs are generated from Protocol Buffer
definitions in api/proto/resolveagent/v1/.

To regenerate:
    buf generate --template tools/buf/buf.gen.yaml api/proto

Modules:
    - registry_pb2: RegistryService message types
    - registry_pb2_grpc: RegistryService gRPC stubs
    - agent_pb2: AgentService message types
    - agent_pb2_grpc: AgentService gRPC stubs
    - common_pb2: Common message types
"""

# Note: The actual generated files will be created by buf generate.
# This __init__.py provides the package structure.

__all__ = [
    "registry_pb2",
    "registry_pb2_grpc",
    "agent_pb2",
    "agent_pb2_grpc",
    "common_pb2",
]

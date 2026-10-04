"""Placeholder for buf-generated Python gRPC stubs.

``tools/buf/buf.gen.yaml`` points the ``protocolbuffers/python`` and
``grpc/python`` plugins at this directory, while ``.gitignore`` excludes the
directory outright with no ``!`` exception (line 94) — this file survives only
because it is already tracked. ``make proto`` (``hack/generate-proto.sh``)
would populate it, but that has never happened in this repository: ``buf`` is
not installed in the dev environment, ``pkg/api`` (the Go output of the same
template) does not exist either, and no ``*_pb2.py`` has ever been generated
here.

The stubs the runtime actually uses are committed under :mod:`resolveagent.v1`
and are produced with ``grpc_tools.protoc`` instead — see
``python/src/resolveagent/v1/__init__.py`` for the exact command.

Do not import from ``resolveagent.api``. ``resolveagent/runtime/server.py``
still does, inside ``try``/``except ImportError`` blocks that therefore always
fall through to the HTTP fallback; that path stays dead until it is rewritten
against ``resolveagent.v1`` (note ``agent.proto`` defines ``AgentService``, not
the ``AgentExecutionService`` that module expects).
"""

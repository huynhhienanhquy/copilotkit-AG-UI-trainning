# FastAPI + Python Guide

Override rules for FastAPI backend projects.

## Package Manager

```bash
# Using pip + venv or poetry
uvicorn src.main:app --reload    # development server
python -m pytest                  # test suite
python -m mypy src/               # type checking
python -m ruff check src/         # linting
python -m ruff format src/        # formatting
```

## Project Conventions

- Routes: `src/routes/` or `src/api/`
- Models: `src/models/` (SQLAlchemy/Pydantic)
- Services: `src/services/` (business logic)
- Dependencies: `src/dependencies/`
- Schemas: `src/schemas/` (Pydantic request/response)

## FastAPI-Specific Rules

- Use Pydantic models for request validation and response serialization.
- Define response models explicitly; do not return raw dicts.
- Use dependency injection for database sessions, auth, and shared resources.
- Handle errors with custom exception handlers; return consistent error shape.
- Use `HTTPException` with status_code and detail for client errors.
- Do not store secrets in code; use `pydantic-settings` or environment variables.

## Error Handling

```python
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

class AppError(HTTPException):
    def __init__(self, status_code: int, code: str, detail: str):
        super().__init__(status_code=status_code, detail=detail)
        self.code = code

async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "code": exc.code,
            "request_id": request.state.request_id,
        },
    )
```

## Testing

```bash
python -m pytest                    # all tests
python -m pytest --cov=src         # with coverage
python -m pytest -x                # stop on first failure
```

- Use `TestClient` for API endpoint tests.
- Mock external services (db, email, payment) at the boundary.
- Test validation errors and error paths.

## Build and Deploy

```bash
# Production with gunicorn + uvicorn workers
gunicorn src.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

- Verify `pyproject.toml` for dependencies and scripts.
- Check Dockerfile for multi-stage build.
- Use environment variables for configuration.

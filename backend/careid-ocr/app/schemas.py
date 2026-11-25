from typing import List, Optional, Any
from pydantic import BaseModel, Field

class LineResult(BaseModel):
    text: str = Field(..., description="Extracted line text")
    confidence: float = Field(..., description="Confidence score between 0.0 and 1.0")
    box: List[Any] = Field(default_factory=list, description="Polygon bounding coordinates")

class PageResult(BaseModel):
    pageNumber: int = Field(..., description="1-based page index")
    rawText: str = Field(..., description="Full text for this page")
    lines: List[LineResult] = Field(default_factory=list, description="Extracted lines")
    imagePath: Optional[str] = Field(None, description="Optional relative rendered image path")
    confidence: Optional[float] = Field(None, description="Page-level average confidence")

class OcrProcessResponse(BaseModel):
    success: bool = Field(True, description="Indicates OCR job success")
    documentType: str = Field(..., description="Document type tag")
    sourceFile: str = Field(..., description="Original or sanitized source filename")
    pageCount: int = Field(..., description="Number of document pages processed")
    overallConfidence: float = Field(..., description="Overall average confidence score")
    combinedText: str = Field(..., description="Full consolidated document text")
    pages: List[PageResult] = Field(default_factory=list, description="Page breakdown")
    durationMs: float = Field(..., description="Processing time in milliseconds")
    engine: str = Field(..., description="Active OCR engine descriptor")
    ocrVersion: Optional[str] = Field("PP-OCRv4", description="Engine version")

class HealthResponse(BaseModel):
    status: str = Field("ok", description="Overall service status")
    worker: str = Field(..., description="Worker service identifier")
    engineReady: bool = Field(..., description="True if PaddleOCR models are loaded and warm")
    ocrVersion: str = Field(..., description="Active OCR model family")
    architecture: str = Field(..., description="Deep learning architecture detail")
    uptimeSeconds: float = Field(..., description="Daemon process uptime")
    residentRamMb: float = Field(..., description="Resident RSS memory in MB")
    peakWorkingSetMb: float = Field(..., description="Peak memory working set in MB")
    activeRequests: int = Field(..., description="Currently executing requests")
    maxConcurrency: int = Field(..., description="Max concurrent processing workers")
    cpuThreads: int = Field(..., description="OpenMP / MKL CPU threads")
    pdfDpi: int = Field(..., description="Target rasterization DPI for PDFs")

class ReadyResponse(BaseModel):
    ready: bool = Field(..., description="Readiness status")
    status: str = Field(..., description="Detailed status message")
    modelLoaded: bool = Field(..., description="Whether model weights are loaded")

class VersionResponse(BaseModel):
    version: str = Field(..., description="Service version")
    ocrVersion: str = Field(..., description="Model version")
    architecture: str = Field(..., description="Model architecture")
    pythonVersion: str = Field(..., description="Python runtime version")

class ProcessFileJsonRequest(BaseModel):
    filePath: Optional[str] = Field(None, description="Absolute or relative file path")
    documentType: Optional[str] = Field("GENERIC", description="Document type category")
    pdfDpi: Optional[int] = Field(150, description="DPI for PDF rendering")

class ErrorResponse(BaseModel):
    success: bool = Field(False, description="Always False for error envelopes")
    error: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error description")


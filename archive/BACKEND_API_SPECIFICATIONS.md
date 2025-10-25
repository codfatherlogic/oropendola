# BACKEND API SPECIFICATIONS - WEEKS 2-4

**Backend**: Frappe Framework + MariaDB at https://oropendola.ai
**Date**: 2025-10-24
**For**: Weeks 2-4 Foundation Features

---

## 📋 OVERVIEW

This document specifies all backend API endpoints needed for Weeks 2-4 features:
- **Week 2.2**: Document Processing (PDF, Word, Excel, PowerPoint, HTML, OCR)
- **Week 3.1**: Internationalization (translations)
- **Week 3.2**: Vector Database (semantic search using MariaDB)

---

## 🗄️ DATABASE SCHEMA

### 1. Vector Storage Table (MariaDB)

Since you're using **MariaDB** (not a specialized vector database), we'll store embeddings as JSON:

```sql
CREATE TABLE `oropendola_vectors` (
  `id` VARCHAR(140) PRIMARY KEY,
  `content` LONGTEXT NOT NULL,
  `embedding` JSON NOT NULL,  -- Store as JSON array [0.123, -0.456, ...]
  `metadata` JSON,             -- Store file_path, type, timestamp, etc.
  `type` VARCHAR(50) NOT NULL, -- 'code', 'document', 'memory'
  `workspace_id` VARCHAR(140),
  `user_id` VARCHAR(140),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `modified_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_type` (`type`),
  INDEX `idx_workspace` (`workspace_id`),
  INDEX `idx_user` (`user_id`),
  FULLTEXT INDEX `idx_content` (`content`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Note**: MariaDB doesn't have native vector similarity search, so we'll need to:
1. Use full-text search for initial filtering
2. Calculate cosine similarity in Python
3. Consider upgrading to MariaDB 10.11+ for JSON functions

### 2. Document Metadata Table

```sql
CREATE TABLE `oropendola_documents` (
  `id` VARCHAR(140) PRIMARY KEY,
  `file_name` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(50) NOT NULL, -- 'pdf', 'docx', 'xlsx', 'pptx', 'html'
  `file_size` BIGINT,
  `file_hash` VARCHAR(64),         -- SHA-256 for deduplication
  `content` LONGTEXT,              -- Extracted text
  `metadata` JSON,                 -- Pages, word count, author, etc.
  `images` JSON,                   -- Array of extracted images
  `tables` JSON,                   -- Array of extracted tables
  `user_id` VARCHAR(140),
  `workspace_id` VARCHAR(140),
  `status` VARCHAR(50) DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  `error_message` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user` (`user_id`),
  INDEX `idx_workspace` (`workspace_id`),
  INDEX `idx_type` (`file_type`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3. Translation Cache Table (Optional)

```sql
CREATE TABLE `oropendola_translations` (
  `id` VARCHAR(140) PRIMARY KEY,
  `language` VARCHAR(10) NOT NULL,  -- 'en', 'es', 'fr', 'de', 'ar'
  `translation_key` VARCHAR(255) NOT NULL,
  `translation_value` TEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_lang_key` (`language`, `translation_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 📡 API ENDPOINTS

### **WEEK 2.2: DOCUMENT PROCESSING**

#### 1. Upload Document

**Endpoint**: `POST /api/method/oropendola.documents.upload`

**Purpose**: Upload a document for processing

**Request**:
```python
# Frappe whitelisted method
@frappe.whitelist()
def upload(file=None):
    """
    Upload document file

    Args:
        file: File object from request

    Returns:
        {
            "document_id": "doc-uuid-123",
            "status": "processing",
            "file_name": "document.pdf",
            "file_type": "pdf",
            "file_size": 1234567
        }
    """
```

**Frontend Request**:
```typescript
const formData = new FormData();
formData.append('file', fileBlob);

const response = await fetch(
  'https://oropendola.ai/api/method/oropendola.documents.upload',
  {
    method: 'POST',
    headers: {
      'X-Frappe-CSRF-Token': csrfToken
    },
    body: formData
  }
);
```

**Response**:
```json
{
  "message": {
    "document_id": "DOC-2024-001",
    "status": "processing",
    "file_name": "report.pdf",
    "file_type": "pdf",
    "file_size": 2456789,
    "estimated_time": 5
  }
}
```

**Processing Logic**:
1. Save file to Frappe file storage
2. Create document record with status='processing'
3. Queue background job for processing
4. Return document_id immediately

---

#### 2. Process Document

**Endpoint**: `POST /api/method/oropendola.documents.process`

**Purpose**: Process uploaded document (background job)

**Request**:
```python
@frappe.whitelist()
def process(document_id):
    """
    Process document: extract text, images, tables

    Args:
        document_id: Document ID from upload

    Processing Steps:
        1. Detect file type
        2. Extract text content
        3. Extract images (if any)
        4. Extract tables (if any)
        5. Generate embeddings for vector search
        6. Store in database
        7. Update status to 'completed'
    """
```

**Libraries to Use** (on backend):
```bash
# Install these Python packages
pip install PyPDF2           # PDF processing
pip install python-docx      # Word documents
pip install openpyxl         # Excel files
pip install python-pptx      # PowerPoint
pip install beautifulsoup4   # HTML parsing
pip install pytesseract      # OCR
pip install Pillow           # Image processing
pip install sentence-transformers  # Embeddings
```

**Processing Implementation**:
```python
import frappe
from PyPDF2 import PdfReader
from docx import Document
from openpyxl import load_workbook
from pptx import Presentation
from bs4 import BeautifulSoup
import pytesseract
from PIL import Image
from sentence_transformers import SentenceTransformer
import json
import hashlib

# Load embedding model (initialize once)
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')  # 384 dimensions

@frappe.whitelist()
def process(document_id):
    doc = frappe.get_doc('Oropendola Document', document_id)

    try:
        # Get file path
        file_path = frappe.get_site_path('private', 'files', doc.file_name)

        # Process based on type
        if doc.file_type == 'pdf':
            result = process_pdf(file_path)
        elif doc.file_type == 'docx':
            result = process_word(file_path)
        elif doc.file_type == 'xlsx':
            result = process_excel(file_path)
        elif doc.file_type == 'pptx':
            result = process_powerpoint(file_path)
        elif doc.file_type == 'html':
            result = process_html(file_path)
        else:
            raise ValueError(f"Unsupported file type: {doc.file_type}")

        # Store results
        doc.content = result['content']
        doc.metadata = json.dumps(result['metadata'])
        doc.images = json.dumps(result.get('images', []))
        doc.tables = json.dumps(result.get('tables', []))
        doc.status = 'completed'
        doc.save()

        # Generate and store embeddings for vector search
        store_embeddings(document_id, result['content'], doc.workspace_id, doc.user_id)

        return {"status": "success", "document_id": document_id}

    except Exception as e:
        doc.status = 'failed'
        doc.error_message = str(e)
        doc.save()
        frappe.log_error(f"Document processing failed: {str(e)}")
        raise

def process_pdf(file_path):
    """Extract text, images, metadata from PDF"""
    reader = PdfReader(file_path)

    content = ""
    images = []
    metadata = {
        "pages": len(reader.pages),
        "author": reader.metadata.get('/Author', ''),
        "title": reader.metadata.get('/Title', ''),
        "created": str(reader.metadata.get('/CreationDate', ''))
    }

    # Extract text from all pages
    for page_num, page in enumerate(reader.pages):
        text = page.extract_text()
        content += f"\n--- Page {page_num + 1} ---\n{text}"

        # Extract images from page (if any)
        if '/XObject' in page['/Resources']:
            xObject = page['/Resources']['/XObject'].get_object()
            for obj in xObject:
                if xObject[obj]['/Subtype'] == '/Image':
                    # Extract and save image
                    # (Implementation details omitted for brevity)
                    images.append({
                        "page": page_num + 1,
                        "format": "image/jpeg"
                    })

    return {
        "content": content.strip(),
        "metadata": metadata,
        "images": images
    }

def process_word(file_path):
    """Extract text from Word document"""
    doc = Document(file_path)

    content = ""
    tables = []

    # Extract paragraphs
    for para in doc.paragraphs:
        content += para.text + "\n"

    # Extract tables
    for table in doc.tables:
        table_data = []
        for row in table.rows:
            row_data = [cell.text for cell in row.cells]
            table_data.append(row_data)
        tables.append(table_data)

    metadata = {
        "paragraphs": len(doc.paragraphs),
        "tables": len(tables),
        "word_count": len(content.split())
    }

    return {
        "content": content.strip(),
        "metadata": metadata,
        "tables": tables
    }

def process_excel(file_path):
    """Extract data from Excel file"""
    wb = load_workbook(file_path, data_only=True)

    content = ""
    tables = []

    for sheet_name in wb.sheetnames:
        sheet = wb[sheet_name]
        content += f"\n=== Sheet: {sheet_name} ===\n"

        sheet_data = []
        for row in sheet.iter_rows(values_only=True):
            row_data = [str(cell) if cell is not None else "" for cell in row]
            sheet_data.append(row_data)
            content += " | ".join(row_data) + "\n"

        tables.append({
            "sheet": sheet_name,
            "data": sheet_data
        })

    metadata = {
        "sheets": len(wb.sheetnames),
        "sheet_names": wb.sheetnames
    }

    return {
        "content": content.strip(),
        "metadata": metadata,
        "tables": tables
    }

def process_powerpoint(file_path):
    """Extract text from PowerPoint"""
    prs = Presentation(file_path)

    content = ""
    images = []

    for slide_num, slide in enumerate(prs.slides):
        content += f"\n=== Slide {slide_num + 1} ===\n"

        # Extract text from shapes
        for shape in slide.shapes:
            if hasattr(shape, "text"):
                content += shape.text + "\n"

            # Check for images
            if shape.shape_type == 13:  # Picture
                images.append({
                    "slide": slide_num + 1,
                    "type": "image"
                })

    metadata = {
        "slides": len(prs.slides),
        "images": len(images)
    }

    return {
        "content": content.strip(),
        "metadata": metadata,
        "images": images
    }

def process_html(file_path):
    """Extract text from HTML"""
    with open(file_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    # Remove script and style elements
    for script in soup(["script", "style"]):
        script.decompose()

    # Get text
    content = soup.get_text()

    # Clean up whitespace
    lines = (line.strip() for line in content.splitlines())
    content = '\n'.join(line for line in lines if line)

    # Extract links
    links = [a.get('href') for a in soup.find_all('a', href=True)]

    metadata = {
        "title": soup.title.string if soup.title else "",
        "links": len(links)
    }

    return {
        "content": content.strip(),
        "metadata": metadata
    }

def process_image_with_ocr(file_path):
    """Extract text from image using OCR"""
    image = Image.open(file_path)

    # Perform OCR
    content = pytesseract.image_to_string(image)

    metadata = {
        "width": image.width,
        "height": image.height,
        "format": image.format
    }

    return {
        "content": content.strip(),
        "metadata": metadata
    }

def store_embeddings(document_id, content, workspace_id, user_id):
    """Generate and store embeddings for vector search"""

    # Split content into chunks (max 512 tokens per chunk)
    chunks = split_into_chunks(content, max_length=500)

    for i, chunk in enumerate(chunks):
        # Generate embedding
        embedding = embedding_model.encode(chunk).tolist()

        # Store in database
        vector_id = f"{document_id}-chunk-{i}"

        frappe.db.sql("""
            INSERT INTO `oropendola_vectors`
            (id, content, embedding, metadata, type, workspace_id, user_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
            content = VALUES(content),
            embedding = VALUES(embedding),
            modified_at = NOW()
        """, (
            vector_id,
            chunk,
            json.dumps(embedding),
            json.dumps({"document_id": document_id, "chunk_index": i}),
            'document',
            workspace_id,
            user_id
        ))

    frappe.db.commit()

def split_into_chunks(text, max_length=500):
    """Split text into chunks for embedding"""
    words = text.split()
    chunks = []
    current_chunk = []
    current_length = 0

    for word in words:
        if current_length + len(word) > max_length:
            chunks.append(' '.join(current_chunk))
            current_chunk = [word]
            current_length = len(word)
        else:
            current_chunk.append(word)
            current_length += len(word) + 1

    if current_chunk:
        chunks.append(' '.join(current_chunk))

    return chunks
```

---

#### 3. Get Document Status

**Endpoint**: `GET /api/method/oropendola.documents.get_status`

**Purpose**: Check document processing status

**Request**:
```python
@frappe.whitelist()
def get_status(document_id):
    """Get document processing status"""
    doc = frappe.get_doc('Oropendola Document', document_id)

    return {
        "document_id": document_id,
        "status": doc.status,
        "file_name": doc.file_name,
        "progress": get_progress_percentage(doc),
        "error_message": doc.error_message if doc.status == 'failed' else None
    }
```

**Response**:
```json
{
  "message": {
    "document_id": "DOC-2024-001",
    "status": "completed",
    "file_name": "report.pdf",
    "progress": 100
  }
}
```

---

#### 4. Get Processed Document

**Endpoint**: `GET /api/method/oropendola.documents.get`

**Purpose**: Retrieve processed document content

**Request**:
```python
@frappe.whitelist()
def get(document_id):
    """Get processed document"""
    doc = frappe.get_doc('Oropendola Document', document_id)

    return {
        "document_id": document_id,
        "file_name": doc.file_name,
        "file_type": doc.file_type,
        "content": doc.content,
        "metadata": json.loads(doc.metadata) if doc.metadata else {},
        "images": json.loads(doc.images) if doc.images else [],
        "tables": json.loads(doc.tables) if doc.tables else [],
        "created_at": str(doc.created_at)
    }
```

**Response**:
```json
{
  "message": {
    "document_id": "DOC-2024-001",
    "file_name": "report.pdf",
    "file_type": "pdf",
    "content": "Full extracted text content...",
    "metadata": {
      "pages": 10,
      "author": "John Doe",
      "word_count": 2500
    },
    "images": [],
    "tables": [],
    "created_at": "2024-10-24 20:30:00"
  }
}
```

---

#### 5. Analyze Document with AI

**Endpoint**: `POST /api/method/oropendola.documents.analyze`

**Purpose**: Send processed document to AI for analysis

**Request**:
```python
@frappe.whitelist()
def analyze(document_id, query=None):
    """
    Analyze document with AI

    Args:
        document_id: Document ID
        query: Optional specific question about document

    Returns:
        AI analysis of the document
    """
    doc = frappe.get_doc('Oropendola Document', document_id)

    if doc.status != 'completed':
        frappe.throw("Document processing not completed")

    # Prepare prompt for AI
    if query:
        prompt = f"Question: {query}\n\nDocument content:\n{doc.content[:4000]}"
    else:
        prompt = f"Please analyze this document and provide a summary:\n\n{doc.content[:4000]}"

    # Send to AI (your existing AI endpoint)
    ai_response = call_ai_model(prompt)

    return {
        "document_id": document_id,
        "analysis": ai_response,
        "query": query
    }
```

**Frontend Request**:
```typescript
const response = await fetch(
  backend.endpoints.analyzeDocument,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document_id: 'DOC-2024-001',
      query: 'What are the main findings in this report?'
    })
  }
);
```

**Response**:
```json
{
  "message": {
    "document_id": "DOC-2024-001",
    "analysis": "This report discusses...",
    "query": "What are the main findings?"
  }
}
```

---

### **WEEK 3.2: VECTOR DATABASE (MariaDB)**

#### 6. Index Code/Text

**Endpoint**: `POST /api/method/oropendola.vector.index`

**Purpose**: Index code or text for semantic search

**Request**:
```python
@frappe.whitelist()
def index(content, file_path=None, metadata=None):
    """
    Index content for vector search

    Args:
        content: Text content to index
        file_path: Optional file path
        metadata: Optional metadata dict
    """
    from sentence_transformers import SentenceTransformer
    import json

    model = SentenceTransformer('all-MiniLM-L6-v2')

    # Generate embedding
    embedding = model.encode(content).tolist()

    # Create unique ID
    import hashlib
    content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
    vector_id = f"vec-{content_hash}"

    # Store in database
    frappe.db.sql("""
        INSERT INTO `oropendola_vectors`
        (id, content, embedding, metadata, type, workspace_id, user_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
        content = VALUES(content),
        embedding = VALUES(embedding),
        modified_at = NOW()
    """, (
        vector_id,
        content,
        json.dumps(embedding),
        json.dumps(metadata or {}),
        'code',
        frappe.local.form_dict.get('workspace_id'),
        frappe.session.user
    ))

    frappe.db.commit()

    return {"vector_id": vector_id, "status": "indexed"}
```

---

#### 7. Semantic Search

**Endpoint**: `POST /api/method/oropendola.vector.search`

**Purpose**: Search indexed content semantically

**Request**:
```python
@frappe.whitelist()
def search(query, limit=10, type=None):
    """
    Semantic search using cosine similarity

    Args:
        query: Search query
        limit: Max results
        type: Optional filter ('code', 'document', 'memory')
    """
    from sentence_transformers import SentenceTransformer
    import numpy as np
    import json

    model = SentenceTransformer('all-MiniLM-L6-v2')

    # Generate query embedding
    query_embedding = model.encode(query)

    # Get all vectors (with optional type filter)
    type_filter = f"AND type = '{type}'" if type else ""

    vectors = frappe.db.sql(f"""
        SELECT id, content, embedding, metadata
        FROM `oropendola_vectors`
        WHERE user_id = %s {type_filter}
    """, (frappe.session.user,), as_dict=True)

    # Calculate cosine similarity for each vector
    results = []
    for vec in vectors:
        vec_embedding = np.array(json.loads(vec['embedding']))
        similarity = cosine_similarity(query_embedding, vec_embedding)

        results.append({
            "id": vec['id'],
            "content": vec['content'],
            "score": float(similarity),
            "metadata": json.loads(vec['metadata'])
        })

    # Sort by similarity score
    results.sort(key=lambda x: x['score'], reverse=True)

    # Return top results
    return {"results": results[:limit]}

def cosine_similarity(vec1, vec2):
    """Calculate cosine similarity between two vectors"""
    import numpy as np
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
```

---

#### 8. Store Memory

**Endpoint**: `POST /api/method/oropendola.vector.store_memory`

**Purpose**: Store conversation in long-term memory

**Request**:
```python
@frappe.whitelist()
def store_memory(conversation, summary=None):
    """
    Store conversation memory

    Args:
        conversation: Conversation history (list of messages)
        summary: Optional summary
    """
    # Generate summary if not provided
    if not summary:
        summary = generate_summary(conversation)

    # Index the summary for later retrieval
    return index(
        content=summary,
        metadata={
            "type": "memory",
            "conversation_length": len(conversation),
            "timestamp": frappe.utils.now()
        }
    )
```

---

#### 9. Retrieve Memories

**Endpoint**: `POST /api/method/oropendola.vector.retrieve_memories`

**Purpose**: Retrieve relevant memories for context

**Request**:
```python
@frappe.whitelist()
def retrieve_memories(query, limit=5):
    """Retrieve relevant memories"""
    return search(query=query, limit=limit, type='memory')
```

---

## 🌍 WEEK 3.1: INTERNATIONALIZATION

### Languages Supported
- **English** (en) - Default
- **Spanish** (es)
- **French** (fr)
- **German** (de)
- **Arabic** (ar) - RTL support

### Backend i18n Endpoints (Optional)

If you want server-side translations:

#### 10. Get Translations

**Endpoint**: `GET /api/method/oropendola.i18n.get_translations`

**Purpose**: Get translations for a language

**Request**:
```python
@frappe.whitelist(allow_guest=True)
def get_translations(language='en'):
    """
    Get all translations for a language

    Returns JSON with all translation keys
    """
    # Check cache first
    cached = frappe.cache().get(f"translations_{language}")
    if cached:
        return json.loads(cached)

    # Load from database
    translations = frappe.db.get_all(
        'Oropendola Translation',
        filters={'language': language},
        fields=['translation_key', 'translation_value']
    )

    result = {}
    for trans in translations:
        result[trans.translation_key] = trans.translation_value

    # Cache for 1 hour
    frappe.cache().setex(f"translations_{language}", 3600, json.dumps(result))

    return result
```

**Response**:
```json
{
  "message": {
    "common.yes": "Sí",
    "common.no": "No",
    "connection.connected": "Conectado exitosamente",
    ...
  }
}
```

---

## 📦 BACKEND DEPENDENCIES

### Python Packages Required

```bash
# Document Processing
pip install PyPDF2==3.0.1
pip install python-docx==1.1.0
pip install openpyxl==3.1.2
pip install python-pptx==0.6.23
pip install beautifulsoup4==4.12.2
pip install pytesseract==0.3.10
pip install Pillow==10.1.0

# Vector Search / Embeddings
pip install sentence-transformers==2.2.2
pip install numpy==1.24.3

# OCR (requires Tesseract installed on system)
# Ubuntu: sudo apt-get install tesseract-ocr
# Mac: brew install tesseract
# Windows: Download installer from GitHub
```

### System Requirements

```bash
# For OCR
sudo apt-get install tesseract-ocr tesseract-ocr-eng tesseract-ocr-spa tesseract-ocr-fra tesseract-ocr-deu tesseract-ocr-ara
```

---

## 🔧 FRAPPE DOCTYPES NEEDED

### 1. Oropendola Document

```python
{
    "name": "Oropendola Document",
    "module": "Oropendola",
    "doctype": "DocType",
    "is_submittable": 0,
    "track_changes": 1,
    "fields": [
        {"fieldname": "file_name", "fieldtype": "Data", "label": "File Name"},
        {"fieldname": "file_type", "fieldtype": "Select", "label": "File Type",
         "options": "pdf\ndocx\nxlsx\npptx\nhtml\nimage"},
        {"fieldname": "file_size", "fieldtype": "Int", "label": "File Size"},
        {"fieldname": "file_hash", "fieldtype": "Data", "label": "File Hash"},
        {"fieldname": "content", "fieldtype": "Long Text", "label": "Content"},
        {"fieldname": "metadata", "fieldtype": "JSON", "label": "Metadata"},
        {"fieldname": "images", "fieldtype": "JSON", "label": "Images"},
        {"fieldname": "tables", "fieldtype": "JSON", "label": "Tables"},
        {"fieldname": "status", "fieldtype": "Select", "label": "Status",
         "options": "processing\ncompleted\nfailed", "default": "processing"},
        {"fieldname": "error_message", "fieldtype": "Text", "label": "Error Message"},
        {"fieldname": "workspace_id", "fieldtype": "Data", "label": "Workspace ID"},
    ]
}
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Backend Setup

- [ ] Install Python dependencies
- [ ] Install Tesseract OCR
- [ ] Create database tables
- [ ] Create Frappe DocTypes
- [ ] Add API methods to hooks.py
- [ ] Configure file upload limits
- [ ] Set up background jobs
- [ ] Test each endpoint

### Configuration

```python
# In hooks.py or site_config.json

# Increase file upload limit
max_file_size = 50 * 1024 * 1024  # 50 MB

# Background job configuration
scheduler_events = {
    "cron": {
        "*/5 * * * *": [
            "oropendola.documents.process_pending"
        ]
    }
}
```

---

## 📞 SUPPORT

**Backend Questions**:
- Database schema
- API implementation
- Performance optimization
- Scaling concerns

**Ready to implement** when you confirm!

---

**Created**: 2025-10-24
**Status**: 📋 **SPECIFICATIONS READY**
**Next**: Start Week 2.2 Frontend Implementation

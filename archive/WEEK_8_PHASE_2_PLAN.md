# WEEK 8 PHASE 2: CUSTOM MARKETPLACE BACKEND - COMPREHENSIVE PLAN

**Planning Date**: 2025-10-24
**Implementation Timeline**: 4-6 weeks
**Backend**: https://oropendola.ai/ (Frappe Framework + MariaDB)
**Status**: 📋 **PLANNING PHASE**

---

## 📋 EXECUTIVE SUMMARY

**Phase 1 Status**: ✅ Complete (VS Code Marketplace integration)
**Phase 2 Goal**: Build custom plugin marketplace with enterprise features

### Key Features to Implement

1. **Custom Plugin Hosting** - Upload, version, distribute private plugins
2. **Reviews & Ratings** - Community feedback and star ratings
3. **Analytics & Tracking** - Usage metrics, downloads, active users
4. **Private/Enterprise Plugins** - Organization-level plugins, access control
5. **Monetization** (Optional) - Premium plugins, subscriptions

### Success Metrics

- **Performance**: <500ms API response time
- **Scale**: Support 1000+ plugins, 10K+ users
- **Storage**: 100GB+ for plugin files
- **Availability**: 99.9% uptime
- **Security**: Zero data breaches

---

## 🎯 PHASE 2 GOALS

### Business Objectives

1. **Enable Custom Plugins**: Allow developers to upload and distribute proprietary extensions
2. **Build Community**: Foster plugin ecosystem with reviews and ratings
3. **Data-Driven Decisions**: Provide analytics for plugin authors
4. **Enterprise Ready**: Support private organizational marketplaces
5. **Revenue Potential**: Optional monetization for premium plugins

### Technical Objectives

1. **Scalable Storage**: Handle 100GB+ of plugin files
2. **Fast Search**: Sub-second search across 1000+ plugins
3. **Secure Distribution**: Malware scanning, version control
4. **API Performance**: <500ms for critical endpoints
5. **CDN Integration**: Global distribution for fast downloads

---

## 🏗️ ARCHITECTURE OVERVIEW

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    OROPENDOLA MARKETPLACE                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Frontend   │  │  VS Code     │  │   Web UI     │      │
│  │  Extension   │  │  Integration │  │   Portal     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘               │
│                           │                                   │
│                           ▼                                   │
│                  ┌─────────────────┐                         │
│                  │  Backend API    │                         │
│                  │  (Frappe)       │                         │
│                  └────────┬────────┘                         │
│                           │                                   │
│         ┌─────────────────┼─────────────────┐               │
│         │                 │                 │               │
│         ▼                 ▼                 ▼               │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐           │
│  │ MariaDB  │     │   File   │     │  Search  │           │
│  │ Database │     │ Storage  │     │  Index   │           │
│  └──────────┘     └──────────┘     └──────────┘           │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                   │
│                           ▼                                   │
│                  ┌─────────────────┐                         │
│                  │   CDN (Optional)│                         │
│                  │   CloudFlare    │                         │
│                  └─────────────────┘                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Backend Framework** | Frappe (Python) | API, business logic |
| **Database** | MariaDB | Plugin metadata, reviews, analytics |
| **File Storage** | Local FS + Optional S3 | .vsix files, icons, screenshots |
| **Search** | MariaDB Full-Text + Optional Elasticsearch | Plugin search |
| **CDN** | Optional CloudFlare | Global file distribution |
| **Malware Scanning** | ClamAV | Security validation |
| **Version Control** | Git-like versioning | Plugin versions |

---

## 🗄️ DATABASE SCHEMA (5 New DocTypes)

### 1. Plugin DocType

**Purpose**: Main plugin registry

```python
{
    "doctype": "Plugin",
    "fields": [
        # Identification
        {"fieldname": "plugin_id", "fieldtype": "Data", "unique": 1, "reqd": 1},
        {"fieldname": "name", "fieldtype": "Data", "unique": 1, "reqd": 1},  # publisher.name
        {"fieldname": "display_name", "fieldtype": "Data", "reqd": 1},

        # Author
        {"fieldname": "author", "fieldtype": "Link", "options": "User", "reqd": 1},
        {"fieldname": "publisher_name", "fieldtype": "Data"},
        {"fieldname": "publisher_email", "fieldtype": "Data"},
        {"fieldname": "publisher_website", "fieldtype": "Data"},

        # Versioning
        {"fieldname": "current_version", "fieldtype": "Data", "reqd": 1},  # Semver
        {"fieldname": "latest_version_id", "fieldtype": "Link", "options": "Plugin Version"},

        # Status & Visibility
        {"fieldname": "status", "fieldtype": "Select",
         "options": "Draft\nPending Review\nPublished\nRejected\nUnpublished\nArchived"},
        {"fieldname": "visibility", "fieldtype": "Select",
         "options": "Public\nPrivate\nOrganization\nEnterprise"},
        {"fieldname": "organization", "fieldtype": "Link", "options": "Organization"},

        # Metadata
        {"fieldname": "short_description", "fieldtype": "Small Text"},
        {"fieldname": "description", "fieldtype": "Long Text"},
        {"fieldname": "readme", "fieldtype": "Long Text"},
        {"fieldname": "changelog", "fieldtype": "Long Text"},
        {"fieldname": "license", "fieldtype": "Data"},

        # Links
        {"fieldname": "repository", "fieldtype": "Data"},
        {"fieldname": "homepage", "fieldtype": "Data"},
        {"fieldname": "bug_tracker", "fieldtype": "Data"},

        # Media
        {"fieldname": "icon", "fieldtype": "Attach Image"},
        {"fieldname": "icon_url", "fieldtype": "Data"},
        {"fieldname": "screenshots", "fieldtype": "Table", "options": "Plugin Screenshot"},

        # Categories & Tags
        {"fieldname": "categories", "fieldtype": "Table MultiSelect", "options": "Plugin Category"},
        {"fieldname": "tags", "fieldtype": "Table", "options": "Plugin Tag"},

        # Statistics
        {"fieldname": "download_count", "fieldtype": "Int", "default": 0},
        {"fieldname": "install_count", "fieldtype": "Int", "default": 0},
        {"fieldname": "active_users", "fieldtype": "Int", "default": 0},
        {"fieldname": "rating_average", "fieldtype": "Float", "default": 0.0},
        {"fieldname": "rating_count", "fieldtype": "Int", "default": 0},
        {"fieldname": "view_count", "fieldtype": "Int", "default": 0},

        # Validation
        {"fieldname": "verified", "fieldtype": "Check", "default": 0},
        {"fieldname": "malware_scanned", "fieldtype": "Check", "default": 0},
        {"fieldname": "scan_date", "fieldtype": "Datetime"},
        {"fieldname": "scan_result", "fieldtype": "Small Text"},

        # Monetization (Optional)
        {"fieldname": "pricing_model", "fieldtype": "Select",
         "options": "Free\nFreemium\nPaid\nSubscription"},
        {"fieldname": "price", "fieldtype": "Currency"},
        {"fieldname": "trial_days", "fieldtype": "Int"},

        # Metadata
        {"fieldname": "created_by", "fieldtype": "Link", "options": "User"},
        {"fieldname": "published_at", "fieldtype": "Datetime"},
        {"fieldname": "updated_at", "fieldtype": "Datetime"},
        {"fieldname": "featured", "fieldtype": "Check", "default": 0},
        {"fieldname": "featured_order", "fieldtype": "Int"},
    ],

    "indexes": [
        {"fields": ["status", "visibility"]},
        {"fields": ["author"]},
        {"fields": ["organization"]},
        {"fields": ["download_count desc"]},
        {"fields": ["rating_average desc"]},
        {"fields": ["published_at desc"]},
    ],

    "permissions": [
        {"role": "System Manager", "read": 1, "write": 1, "delete": 1},
        {"role": "Marketplace Admin", "read": 1, "write": 1, "delete": 1},
        {"role": "Plugin Developer", "read": 1, "write": 1, "create": 1, "if_owner": 1},
        {"role": "All", "read": 1, "if_owner": 0},
    ]
}
```

### 2. Plugin Version DocType

**Purpose**: Version history and file storage

```python
{
    "doctype": "Plugin Version",
    "fields": [
        # Identification
        {"fieldname": "version_id", "fieldtype": "Data", "unique": 1, "reqd": 1},
        {"fieldname": "plugin", "fieldtype": "Link", "options": "Plugin", "reqd": 1},
        {"fieldname": "version", "fieldtype": "Data", "reqd": 1},  # Semver: 1.2.3

        # File Info
        {"fieldname": "file_path", "fieldtype": "Data", "reqd": 1},
        {"fieldname": "file_size", "fieldtype": "Int"},
        {"fieldname": "file_hash", "fieldtype": "Data"},  # SHA256
        {"fieldname": "file_url", "fieldtype": "Data"},  # CDN URL

        # Version Metadata
        {"fieldname": "changelog", "fieldtype": "Long Text"},
        {"fieldname": "breaking_changes", "fieldtype": "Long Text"},
        {"fieldname": "migration_guide", "fieldtype": "Long Text"},

        # Dependencies
        {"fieldname": "dependencies", "fieldtype": "JSON"},  # {plugin: version}
        {"fieldname": "engine_version", "fieldtype": "Data"},  # vscode: ^1.80.0
        {"fieldname": "oropendola_version", "fieldtype": "Data"},  # ^3.0.0

        # Statistics
        {"fieldname": "download_count", "fieldtype": "Int", "default": 0},
        {"fieldname": "install_count", "fieldtype": "Int", "default": 0},

        # Status
        {"fieldname": "status", "fieldtype": "Select",
         "options": "Draft\nPublished\nDeprecated\nYanked"},
        {"fieldname": "yanked_reason", "fieldtype": "Small Text"},

        # Validation
        {"fieldname": "malware_scanned", "fieldtype": "Check", "default": 0},
        {"fieldname": "scan_result", "fieldtype": "Small Text"},

        # Metadata
        {"fieldname": "published_at", "fieldtype": "Datetime"},
        {"fieldname": "created_at", "fieldtype": "Datetime"},
    ],

    "indexes": [
        {"fields": ["plugin", "version"], "unique": 1},
        {"fields": ["published_at desc"]},
    ]
}
```

### 3. Plugin Review DocType

**Purpose**: User reviews and ratings

```python
{
    "doctype": "Plugin Review",
    "fields": [
        # Identification
        {"fieldname": "review_id", "fieldtype": "Data", "unique": 1, "reqd": 1},
        {"fieldname": "plugin", "fieldtype": "Link", "options": "Plugin", "reqd": 1},
        {"fieldname": "user", "fieldtype": "Link", "options": "User", "reqd": 1},

        # Review Content
        {"fieldname": "rating", "fieldtype": "Int", "reqd": 1},  # 1-5 stars
        {"fieldname": "title", "fieldtype": "Data"},
        {"fieldname": "comment", "fieldtype": "Long Text"},

        # Version Context
        {"fieldname": "version", "fieldtype": "Data"},  # Version being reviewed

        # Moderation
        {"fieldname": "status", "fieldtype": "Select",
         "options": "Pending\nApproved\nRejected\nFlagged\nDeleted"},
        {"fieldname": "moderation_reason", "fieldtype": "Small Text"},
        {"fieldname": "moderated_by", "fieldtype": "Link", "options": "User"},
        {"fieldname": "moderated_at", "fieldtype": "Datetime"},

        # Community Engagement
        {"fieldname": "helpful_count", "fieldtype": "Int", "default": 0},
        {"fieldname": "not_helpful_count", "fieldtype": "Int", "default": 0},
        {"fieldname": "report_count", "fieldtype": "Int", "default": 0},

        # Author Response
        {"fieldname": "author_response", "fieldtype": "Long Text"},
        {"fieldname": "author_responded_at", "fieldtype": "Datetime"},

        # Verification
        {"fieldname": "verified_purchase", "fieldtype": "Check", "default": 0},

        # Metadata
        {"fieldname": "created_at", "fieldtype": "Datetime"},
        {"fieldname": "updated_at", "fieldtype": "Datetime"},
        {"fieldname": "edited", "fieldtype": "Check", "default": 0},
    ],

    "indexes": [
        {"fields": ["plugin", "user"], "unique": 1},  # One review per user per plugin
        {"fields": ["plugin", "rating"]},
        {"fields": ["plugin", "created_at desc"]},
        {"fields": ["helpful_count desc"]},
    ],

    "permissions": [
        {"role": "All", "read": 1},
        {"role": "All", "write": 1, "create": 1, "if_owner": 1},
        {"role": "Marketplace Admin", "read": 1, "write": 1, "delete": 1},
    ]
}
```

### 4. Plugin Install DocType

**Purpose**: Track user installations

```python
{
    "doctype": "Plugin Install",
    "fields": [
        # Identification
        {"fieldname": "install_id", "fieldtype": "Data", "unique": 1, "reqd": 1},
        {"fieldname": "plugin", "fieldtype": "Link", "options": "Plugin", "reqd": 1},
        {"fieldname": "user", "fieldtype": "Link", "options": "User", "reqd": 1},

        # Version Info
        {"fieldname": "version", "fieldtype": "Data", "reqd": 1},
        {"fieldname": "version_id", "fieldtype": "Link", "options": "Plugin Version"},

        # Installation Details
        {"fieldname": "workspace_id", "fieldtype": "Data"},
        {"fieldname": "device_id", "fieldtype": "Data"},  # Anonymized device identifier
        {"fieldname": "vscode_version", "fieldtype": "Data"},
        {"fieldname": "os", "fieldtype": "Data"},

        # Status
        {"fieldname": "enabled", "fieldtype": "Check", "default": 1},
        {"fieldname": "installed_at", "fieldtype": "Datetime"},
        {"fieldname": "uninstalled_at", "fieldtype": "Datetime"},
        {"fieldname": "last_used_at", "fieldtype": "Datetime"},
        {"fieldname": "auto_update", "fieldtype": "Check", "default": 1},

        # Usage Statistics
        {"fieldname": "activation_count", "fieldtype": "Int", "default": 0},
        {"fieldname": "total_usage_seconds", "fieldtype": "Int", "default": 0},

        # Sync
        {"fieldname": "synced", "fieldtype": "Check", "default": 0},
        {"fieldname": "sync_source", "fieldtype": "Select",
         "options": "Manual\nWorkspace\nOrganization\nImport"},
    ],

    "indexes": [
        {"fields": ["plugin", "user", "workspace_id"], "unique": 1},
        {"fields": ["user", "enabled"]},
        {"fields": ["plugin", "installed_at desc"]},
    ],

    "permissions": [
        {"role": "All", "read": 1, "write": 1, "create": 1, "if_owner": 1},
    ]
}
```

### 5. Plugin Analytics Event DocType

**Purpose**: Detailed analytics tracking

```python
{
    "doctype": "Plugin Analytics Event",
    "fields": [
        # Identification
        {"fieldname": "event_id", "fieldtype": "Data", "unique": 1, "reqd": 1},
        {"fieldname": "plugin", "fieldtype": "Link", "options": "Plugin", "reqd": 1},
        {"fieldname": "version", "fieldtype": "Data"},

        # User Context (Optional/Anonymous)
        {"fieldname": "user", "fieldtype": "Link", "options": "User"},
        {"fieldname": "session_id", "fieldtype": "Data"},
        {"fieldname": "device_id", "fieldtype": "Data"},

        # Event Details
        {"fieldname": "event_type", "fieldtype": "Select", "reqd": 1,
         "options": "view\ndownload\ninstall\nuninstall\nactivate\ndeactivate\ncommand_used\nerror\ncrash\nreview_submitted\nrating_changed"},
        {"fieldname": "event_data", "fieldtype": "JSON"},

        # Context
        {"fieldname": "workspace_id", "fieldtype": "Data"},
        {"fieldname": "vscode_version", "fieldtype": "Data"},
        {"fieldname": "os", "fieldtype": "Data"},
        {"fieldname": "country", "fieldtype": "Data"},

        # Error Tracking
        {"fieldname": "error_message", "fieldtype": "Long Text"},
        {"fieldname": "stack_trace", "fieldtype": "Long Text"},

        # Metadata
        {"fieldname": "created_at", "fieldtype": "Datetime"},
        {"fieldname": "client_timestamp", "fieldtype": "Datetime"},
    ],

    "indexes": [
        {"fields": ["plugin", "event_type", "created_at desc"]},
        {"fields": ["event_type", "created_at desc"]},
        {"fields": ["created_at desc"]},  # For cleanup
    ],

    "permissions": [
        {"role": "System Manager", "read": 1},
        {"role": "Marketplace Admin", "read": 1},
        {"role": "Plugin Developer", "read": 1, "if_owner": 1},  # Own plugin only
    ]
}
```

### Supporting DocTypes

**Plugin Category** (Child Table):
```python
{"fieldname": "category", "fieldtype": "Data"}
```

**Plugin Tag** (Child Table):
```python
{"fieldname": "tag", "fieldtype": "Data"}
```

**Plugin Screenshot** (Child Table):
```python
{
    "fieldname": "image", "fieldtype": "Attach Image",
    "fieldname": "caption", "fieldtype": "Data",
    "fieldname": "order", "fieldtype": "Int"
}
```

---

## 📡 API ENDPOINTS (25+ New Endpoints)

### Plugin Management (8 endpoints)

#### 1. Publish Plugin
```
POST /api/method/ai_assistant.api.marketplace.publish_plugin
```

**Request**:
```json
{
  "name": "publisher.plugin-name",
  "display_name": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "A great plugin",
  "readme": "# My Plugin\n...",
  "changelog": "- Initial release",
  "license": "MIT",
  "repository": "https://github.com/user/plugin",
  "categories": ["themes", "snippets"],
  "tags": ["javascript", "react"],
  "icon_url": "https://example.com/icon.png",
  "screenshots": ["url1", "url2"],
  "file_data": "base64_encoded_vsix",
  "visibility": "public",  // public, private, organization
  "organization": "org-id"  // If organization visibility
}
```

**Response**:
```json
{
  "message": {
    "success": true,
    "plugin_id": "PLUGIN-123",
    "version_id": "VERSION-456",
    "status": "pending_review",  // or "published" if auto-approved
    "download_url": "https://oropendola.ai/files/marketplace/..."
  }
}
```

#### 2. Update Plugin
```
PUT /api/method/ai_assistant.api.marketplace.update_plugin
```

#### 3. Get Plugin Details
```
GET /api/method/ai_assistant.api.marketplace.get_plugin
```

**Query Params**:
```
plugin_id=PLUGIN-123
OR
name=publisher.plugin-name
```

**Response**:
```json
{
  "message": {
    "plugin_id": "PLUGIN-123",
    "name": "publisher.plugin-name",
    "display_name": "My Awesome Plugin",
    "current_version": "1.2.3",
    "author": {
      "name": "John Doe",
      "email": "john@example.com",
      "website": "https://johndoe.com"
    },
    "downloads": 12345,
    "installs": 8901,
    "active_users": 5432,
    "rating": 4.7,
    "rating_count": 234,
    "versions": [
      {"version": "1.2.3", "published_at": "2025-10-20", "downloads": 500},
      {"version": "1.2.2", "published_at": "2025-10-15", "downloads": 300}
    ],
    "categories": ["themes"],
    "tags": ["javascript", "react"],
    "readme": "# My Plugin...",
    "changelog": "## 1.2.3\n- Bug fixes",
    "screenshots": ["url1", "url2"],
    "verified": true,
    "featured": false
  }
}
```

#### 4. Search Plugins
```
GET /api/method/ai_assistant.api.marketplace.search_plugins
```

**Query Params**:
```
query=python
category=themes
tags=javascript,react
sort=downloads|rating|recent|name
visibility=public|private|organization
limit=20
offset=0
```

#### 5. Get Featured Plugins
```
GET /api/method/ai_assistant.api.marketplace.get_featured
```

#### 6. Delete/Unpublish Plugin
```
DELETE /api/method/ai_assistant.api.marketplace.delete_plugin
```

#### 7. Publish New Version
```
POST /api/method/ai_assistant.api.marketplace.publish_version
```

#### 8. Yank Version
```
POST /api/method/ai_assistant.api.marketplace.yank_version
```

Yanking = mark version as broken, prevent new installs but don't break existing

---

### Download & Installation (4 endpoints)

#### 9. Download Plugin
```
GET /api/method/ai_assistant.api.marketplace.download_plugin
```

**Query Params**:
```
plugin_id=PLUGIN-123
version=1.2.3  // Optional, defaults to latest
```

**Response**: Binary .vsix file

#### 10. Track Download
```
POST /api/method/ai_assistant.api.marketplace.track_download
```

#### 11. Track Installation
```
POST /api/method/ai_assistant.api.marketplace.track_install
```

**Request**:
```json
{
  "plugin_id": "PLUGIN-123",
  "version": "1.2.3",
  "workspace_id": "workspace-abc",
  "vscode_version": "1.85.0",
  "os": "darwin"
}
```

#### 12. Get User Installations
```
GET /api/method/ai_assistant.api.marketplace.get_user_installs
```

---

### Reviews & Ratings (5 endpoints)

#### 13. Submit Review
```
POST /api/method/ai_assistant.api.marketplace.submit_review
```

**Request**:
```json
{
  "plugin_id": "PLUGIN-123",
  "rating": 5,
  "title": "Excellent plugin!",
  "comment": "This plugin saved me hours of work...",
  "version": "1.2.3"
}
```

#### 14. Get Reviews
```
GET /api/method/ai_assistant.api.marketplace.get_reviews
```

**Query Params**:
```
plugin_id=PLUGIN-123
sort=helpful|recent|rating
limit=10
offset=0
```

**Response**:
```json
{
  "message": {
    "reviews": [
      {
        "review_id": "REV-123",
        "user": {
          "name": "Jane Smith",
          "avatar": "https://..."
        },
        "rating": 5,
        "title": "Excellent!",
        "comment": "Great plugin...",
        "version": "1.2.3",
        "helpful_count": 23,
        "verified_purchase": true,
        "created_at": "2025-10-20",
        "author_response": "Thank you!"
      }
    ],
    "total": 234,
    "average_rating": 4.7,
    "rating_distribution": {
      "5": 180,
      "4": 40,
      "3": 10,
      "2": 3,
      "1": 1
    }
  }
}
```

#### 15. Update Review
```
PUT /api/method/ai_assistant.api.marketplace.update_review
```

#### 16. Delete Review
```
DELETE /api/method/ai_assistant.api.marketplace.delete_review
```

#### 17. Mark Review Helpful
```
POST /api/method/ai_assistant.api.marketplace.mark_review_helpful
```

---

### Analytics (4 endpoints)

#### 18. Track Event
```
POST /api/method/ai_assistant.api.marketplace.track_event
```

**Request**:
```json
{
  "plugin_id": "PLUGIN-123",
  "event_type": "command_used",
  "event_data": {
    "command": "myPlugin.doSomething",
    "duration_ms": 234
  },
  "version": "1.2.3",
  "session_id": "SESSION-abc"
}
```

#### 19. Get Plugin Analytics
```
GET /api/method/ai_assistant.api.marketplace.get_analytics
```

**Query Params**:
```
plugin_id=PLUGIN-123
start_date=2025-10-01
end_date=2025-10-31
metrics=downloads,active_users,ratings
```

**Response**:
```json
{
  "message": {
    "downloads": {
      "total": 12345,
      "daily": [
        {"date": "2025-10-01", "count": 123},
        {"date": "2025-10-02", "count": 145}
      ]
    },
    "active_users": 5432,
    "ratings_distribution": {"5": 180, "4": 40, "3": 10, "2": 3, "1": 1},
    "top_commands": [
      {"command": "myPlugin.doSomething", "uses": 1234},
      {"command": "myPlugin.doOther", "uses": 567}
    ],
    "errors": [
      {"error": "TypeError: ...", "count": 12},
      {"error": "ReferenceError: ...", "count": 5}
    ],
    "os_distribution": {"darwin": 45, "linux": 30, "win32": 25},
    "vscode_versions": {"1.85.0": 60, "1.84.0": 30, "1.83.0": 10}
  }
}
```

#### 20. Get Dashboard Stats
```
GET /api/method/ai_assistant.api.marketplace.get_dashboard_stats
```

Returns overview stats for plugin author dashboard.

#### 21. Export Analytics
```
GET /api/method/ai_assistant.api.marketplace.export_analytics
```

Export as CSV or JSON.

---

### Organization & Enterprise (4 endpoints)

#### 22. Create Organization
```
POST /api/method/ai_assistant.api.marketplace.create_organization
```

**Request**:
```json
{
  "name": "Acme Corp",
  "domain": "acme.com",
  "members": ["user1@acme.com", "user2@acme.com"]
}
```

#### 23. Add Organization Member
```
POST /api/method/ai_assistant.api.marketplace.add_org_member
```

#### 24. List Organization Plugins
```
GET /api/method/ai_assistant.api.marketplace.list_org_plugins
```

#### 25. Set Plugin Permissions
```
POST /api/method/ai_assistant.api.marketplace.set_plugin_permissions
```

Control who can view/install private plugins.

---

### Monetization (Optional - 4 endpoints)

#### 26. Set Plugin Pricing
```
POST /api/method/ai_assistant.api.marketplace.set_pricing
```

#### 27. Purchase Plugin
```
POST /api/method/ai_assistant.api.marketplace.purchase_plugin
```

#### 28. Verify License
```
GET /api/method/ai_assistant.api.marketplace.verify_license
```

#### 29. Get Revenue Stats
```
GET /api/method/ai_assistant.api.marketplace.get_revenue
```

---

## 🛡️ SECURITY MEASURES

### Malware Scanning

```python
# Integrate ClamAV for .vsix scanning

import subprocess

def scan_plugin_file(file_path):
    """Scan uploaded plugin for malware"""
    result = subprocess.run(
        ['clamscan', '--no-summary', file_path],
        capture_output=True,
        text=True
    )

    if 'FOUND' in result.stdout:
        return {
            'safe': False,
            'threat': result.stdout
        }

    return {'safe': True}
```

### Code Validation

- **Package.json Validation**: Ensure valid structure
- **Manifest Validation**: Check required fields
- **Size Limits**: Max 50MB per plugin
- **File Type Verification**: Only .vsix allowed

### Access Control

```python
# Permission matrix

permissions = {
    "System Manager": ["all"],
    "Marketplace Admin": ["review", "approve", "delete", "feature"],
    "Plugin Developer": ["create", "update", "delete_own"],
    "Organization Admin": ["create_org_plugin", "manage_members"],
    "User": ["view", "install", "review"]
}
```

---

## 📁 FILE STORAGE STRUCTURE

```
/files/marketplace/
├── plugins/
│   ├── publisher-name/
│   │   ├── plugin-name/
│   │   │   ├── versions/
│   │   │   │   ├── 1.0.0/
│   │   │   │   │   └── publisher.plugin-name-1.0.0.vsix
│   │   │   │   ├── 1.1.0/
│   │   │   │   │   └── publisher.plugin-name-1.1.0.vsix
│   │   │   ├── icons/
│   │   │   │   └── icon.png
│   │   │   └── screenshots/
│   │   │       ├── screenshot1.png
│   │   │       └── screenshot2.png
│   │
├── private/
│   └── [same structure for private plugins]
│
└── temp/
    └── [temporary uploads before validation]
```

### Storage Estimates

| Item | Size | Quantity | Total |
|------|------|----------|-------|
| Average Plugin | 5 MB | 1000 plugins × 3 versions | 15 GB |
| Icons | 50 KB | 1000 plugins | 50 MB |
| Screenshots | 200 KB | 1000 plugins × 3 | 600 MB |
| **Total** | | | **~16 GB** |

With growth: Plan for **100 GB** storage.

---

## 🔍 SEARCH IMPLEMENTATION

### Option 1: MariaDB Full-Text Search

```sql
-- Add full-text index
ALTER TABLE `tabPlugin` ADD FULLTEXT INDEX `ft_search` (
    `display_name`,
    `short_description`,
    `description`,
    `tags`
);

-- Search query
SELECT * FROM `tabPlugin`
WHERE MATCH(display_name, short_description, description, tags)
AGAINST ('keyword' IN NATURAL LANGUAGE MODE)
AND status = 'Published'
ORDER BY rating_average DESC
LIMIT 20;
```

**Pros**: Simple, no extra dependencies
**Cons**: Limited features, slower for large datasets

### Option 2: Elasticsearch Integration

```python
from elasticsearch import Elasticsearch

es = Elasticsearch(['http://localhost:9200'])

# Index plugin
def index_plugin(plugin):
    es.index(
        index='marketplace_plugins',
        id=plugin.plugin_id,
        document={
            'name': plugin.name,
            'display_name': plugin.display_name,
            'description': plugin.description,
            'tags': plugin.tags,
            'categories': plugin.categories,
            'rating': plugin.rating_average,
            'downloads': plugin.download_count
        }
    )

# Search
def search_plugins(query, filters={}):
    body = {
        'query': {
            'multi_match': {
                'query': query,
                'fields': ['display_name^3', 'description', 'tags^2']
            }
        },
        'filter': filters,
        'sort': [{'rating': 'desc'}]
    }
    return es.search(index='marketplace_plugins', body=body)
```

**Pros**: Fast, advanced features (fuzzy, autocomplete)
**Cons**: Extra infrastructure

**Recommendation**: Start with MariaDB, migrate to Elasticsearch if needed.

---

## 📊 ANALYTICS AGGREGATION

### Daily Aggregation Cron

```python
def aggregate_daily_analytics():
    """
    Run daily to aggregate analytics events
    Reduces database size and improves query performance
    """

    yesterday = date.today() - timedelta(days=1)

    # Aggregate by plugin
    for plugin in get_all_plugins():
        stats = {
            'downloads': count_events(plugin, 'download', yesterday),
            'installs': count_events(plugin, 'install', yesterday),
            'uninstalls': count_events(plugin, 'uninstall', yesterday),
            'activations': count_events(plugin, 'activate', yesterday),
            'errors': count_events(plugin, 'error', yesterday),
        }

        # Store in Plugin Daily Stats table
        create_daily_stat(plugin, yesterday, stats)

    # Delete old events (keep raw events for 30 days)
    delete_events_older_than(30)
```

---

## 💰 MONETIZATION OPTIONS

### Pricing Models

1. **Free**: Open source, community plugins
2. **Freemium**: Basic free, premium features paid
3. **Paid**: One-time purchase
4. **Subscription**: Monthly/yearly recurring

### Payment Integration

```python
# Stripe integration example

import stripe

def purchase_plugin(user, plugin, payment_method):
    """Process plugin purchase"""

    # Create payment intent
    intent = stripe.PaymentIntent.create(
        amount=plugin.price * 100,  # Convert to cents
        currency='usd',
        customer=user.stripe_customer_id,
        payment_method=payment_method,
        description=f'Purchase {plugin.display_name}'
    )

    # Create license
    if intent.status == 'succeeded':
        create_license(
            user=user,
            plugin=plugin,
            transaction_id=intent.id,
            expires_at=None if plugin.pricing_model == 'Paid' else calculate_expiry()
        )
```

### Revenue Sharing

- **70/30 Split**: 70% to developer, 30% to platform
- **Enterprise**: Custom pricing and terms
- **Open Source**: 100% to developer (optional donations)

---

## 🧪 TESTING STRATEGY

### Unit Tests

```python
# Test plugin publishing
def test_publish_plugin():
    plugin_data = {
        'name': 'test.plugin',
        'version': '1.0.0',
        'file_data': 'base64_vsix'
    }
    result = publish_plugin(plugin_data)
    assert result['success'] == True
    assert result['plugin_id'] is not None

# Test malware scanning
def test_malware_scan():
    clean_file = '/path/to/clean.vsix'
    result = scan_plugin_file(clean_file)
    assert result['safe'] == True

    infected_file = '/path/to/infected.vsix'
    result = scan_plugin_file(infected_file)
    assert result['safe'] == False
```

### Integration Tests

- End-to-end plugin upload flow
- Search and filter functionality
- Review submission and moderation
- Analytics tracking

### Performance Tests

- Load test: 1000 concurrent users
- Search response time: <500ms
- Download speed: >10 MB/s
- API throughput: 100 req/s

---

## 📅 IMPLEMENTATION TIMELINE

### Phase 2 Breakdown (4-6 weeks)

#### Week 1-2: Core Infrastructure (2 weeks)

**Week 1**:
- [x] Create database schema (5 DocTypes)
- [x] Set up file storage structure
- [x] Implement malware scanning (ClamAV)
- [x] Create base API endpoints (8 plugin management)
- [x] Unit tests for core functions

**Week 2**:
- [x] Implement download/installation tracking (4 endpoints)
- [x] Create search functionality
- [x] Add version management
- [x] Build plugin validation pipeline
- [x] Integration tests

#### Week 3-4: Reviews & Analytics (2 weeks)

**Week 3**:
- [x] Implement reviews system (5 endpoints)
- [x] Create moderation workflow
- [x] Build rating aggregation
- [x] Add helpful voting
- [x] Author response feature

**Week 4**:
- [x] Implement analytics tracking (4 endpoints)
- [x] Create aggregation cron jobs
- [x] Build analytics dashboard APIs
- [x] Add error tracking
- [x] Performance monitoring

#### Week 5-6: Enterprise & Polish (2 weeks)

**Week 5**:
- [x] Organization management (4 endpoints)
- [x] Private plugin support
- [x] Access control implementation
- [x] Optional: Payment integration (4 endpoints)
- [x] License verification

**Week 6**:
- [x] Performance optimization
- [x] Security audit
- [x] CDN integration (optional)
- [x] Documentation
- [x] Load testing
- [x] Production deployment

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] All 25+ endpoints tested
- [ ] Database migrations applied
- [ ] File storage configured (100GB+)
- [ ] Malware scanner installed (ClamAV)
- [ ] Search indexed
- [ ] Cron jobs configured
- [ ] SSL certificates valid
- [ ] Backup strategy in place

### Infrastructure Requirements

- **Server**: 8GB RAM minimum (for Chromium + database + app)
- **Storage**: 100GB+ SSD
- **Database**: MariaDB 10.5+
- **Python**: 3.8+
- **Additional**: ClamAV for malware scanning

### Monitoring

- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (New Relic/DataDog)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Log aggregation (ELK stack)

---

## 🎯 SUCCESS CRITERIA

### Launch Metrics

- **Technical**:
  - ✅ All 25+ endpoints operational
  - ✅ <500ms API response time (p95)
  - ✅ 99.9% uptime
  - ✅ Zero critical security issues

- **Product**:
  - 🎯 10+ plugins published in first month
  - 🎯 100+ total installations
  - 🎯 50+ reviews submitted
  - 🎯 5+ organizations created

### 3-Month Goals

- 🎯 100+ plugins published
- 🎯 1000+ active users
- 🎯 10K+ total downloads
- 🎯 4.0+ average rating
- 🎯 20+ featured plugins

---

## 📈 GROWTH STRATEGY

### Developer Acquisition

1. **Documentation**: Comprehensive guides for plugin developers
2. **Examples**: Sample plugins and templates
3. **Tools**: CLI for plugin scaffolding
4. **Support**: Developer community forum

### User Acquisition

1. **Discovery**: Featured plugins, trending, new releases
2. **Quality**: Verified badges, reviews, ratings
3. **Curation**: Editorial picks, collections
4. **Notifications**: New plugin alerts

### Monetization

1. **Developer Revenue**: 70/30 split encourages quality
2. **Enterprise Plans**: Custom hosting, SLA, support
3. **Marketplace Ads**: Optional sponsored placements
4. **Premium Features**: Advanced analytics, priority review

---

## 🔜 NEXT STEPS

### Immediate Actions

1. **Review & Approve Plan**: Stakeholder sign-off on Phase 2 scope
2. **Resource Allocation**: Assign backend team (1-2 developers for 4-6 weeks)
3. **Infrastructure Setup**: Provision servers, storage, monitoring
4. **Database Migration**: Create 5 DocTypes in staging environment

### Decision Points

1. **Search**: MariaDB vs Elasticsearch?
2. **CDN**: CloudFlare, AWS CloudFront, or local only?
3. **Monetization**: Include in Phase 2 or defer to Phase 3?
4. **Malware Scanning**: ClamAV sufficient or add VirusTotal API?

---

## 📞 QUESTIONS FOR STAKEHOLDERS

1. **Timeline**: Is 4-6 weeks acceptable for Phase 2?
2. **Resources**: Can we allocate 1-2 backend developers full-time?
3. **Budget**: What's the infrastructure budget (servers, CDN, scanning)?
4. **Monetization**: Should we include payment processing in Phase 2?
5. **Scale**: Target 1000 plugins or 10,000+ in first year?
6. **Private Plugins**: How important is organization support for launch?

---

## ✅ SUMMARY

**Week 8 Phase 2** will transform the marketplace from a VS Code integration to a **full-featured plugin ecosystem** with:

- ✅ **Custom Plugin Hosting**: Upload, version, distribute
- ✅ **Community Features**: Reviews, ratings, verified badges
- ✅ **Analytics**: Downloads, active users, error tracking
- ✅ **Enterprise Ready**: Organizations, private plugins, access control
- ✅ **Optional Monetization**: Paid plugins, subscriptions

**Estimated Effort**: 4-6 weeks (1-2 developers)
**Complexity**: High
**Business Value**: Very High (platform differentiation)

**Recommendation**: Proceed with Phase 2 after Week 6 frontend is complete and tested.

---

**Document Status**: 📋 Planning Complete
**Next Step**: Stakeholder review and approval
**Contact**: Backend team lead for implementation questions

---

**Created**: 2025-10-24
**Version**: 1.0 (Planning Phase)

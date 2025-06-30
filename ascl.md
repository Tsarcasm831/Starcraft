# 🧠 ASCL: Agent Shorthand Change Log Format

The **Agent Shorthand Change Log (ASCL)** is a specialized logging syntax designed for agent-to-agent communication. It is a minimalistic, structured, and timestamped system for documenting changes in a software ecosystem. ASCL is not optimized for human readability but rather for agent parsing, syncing, and diffing across distributed or automated environments.

---

## 🔧 Purpose

ASCL enables:

* Rapid, structured, and trackable logging of changes.
* Minimal parsing overhead.
* Consistent schema for change monitoring, synchronization, and rollback.
* Zero-ambiguity syntax for automated audits, syncs, migrations, and intelligent rollback decisions.

---

## 🔢 Format Structure

Each ASCL entry follows this base format:

```text
[TS] MMDDYY-HHMM | [MOD] <module> | [ACT] <action> | [TGT] <target> | [VAL] <value> | [REF] <reference>
```

### 🏛️ Field Definitions:

| Tag     | Meaning                                          |
| ------- | ------------------------------------------------ |
| `[TS]`  | **Current timestamp** of the change (MMDDYY-HHMM, 24-hour clock). This must be accurate to the time of the log entry. |
| `[MOD]` | Module or subsystem the change was made in       |
| `[ACT]` | Action taken (e.g., add, remove, modify)         |
| `[TGT]` | Target item that was acted upon                  |
| `[VAL]` | Specific values/parameters related to the change |
| `[REF]` | Reference to exact file path and/or line number  |

---

## 📊 Action Codes (`[ACT]`)

To ensure full support across HTML, CSS, JS, PHP, and Python, ASCL supports the following actions:

### General Actions

| Code     | Description                     |
| -------- | ------------------------------- |
| `+VAR`   | Added variable                  |
| `-VAR`   | Removed variable                |
| `^VAR`   | Modified variable value or type |
| `+FN`    | Added function or method        |
| `-FN`    | Removed function or method      |
| `^FUNC`  | Modified function logic         |
| `+CLASS` | Added class or object           |
| `-CLASS` | Removed class or object         |
| `^CLASS` | Modified class internals        |
| `+FILE`  | Added file                      |
| `-FILE`  | Deleted file                    |
| `MIGR`   | Migration operation performed   |
| `NOTE`   | Internal note or marker         |

### HTML-Specific

| Code    | Description                             |
| ------- | --------------------------------------- |
| `+TAG`  | Added HTML tag                          |
| `-TAG`  | Removed HTML tag                        |
| `^TAG`  | Modified HTML tag content or attributes |
| `+ATTR` | Added attribute to element              |
| `-ATTR` | Removed attribute                       |
| `^ATTR` | Modified attribute value                |

### CSS-Specific

| Code    | Description                  |
| ------- | ---------------------------- |
| `+RULE` | Added CSS rule or selector   |
| `-RULE` | Removed CSS rule or selector |
| `^RULE` | Modified existing CSS rule   |
| `+PROP` | Added property to selector   |
| `-PROP` | Removed property             |
| `^PROP` | Modified property value      |

### JS/PHP/Python-Specific

| Code     | Description                     |
| -------- | ------------------------------- |
| `+MOD`   | Imported module                 |
| `-MOD`   | Removed module                  |
| `^MOD`   | Modified import behavior        |
| `+DEC`   | Added decorator or annotation   |
| `-DEC`   | Removed decorator or annotation |
| `+EXC`   | Added exception handling        |
| `^EXC`   | Modified exception handling     |
| `+ASYNC` | Marked function as async        |
| `^ASYNC` | Modified async behavior         |

Custom actions are permitted, but must follow the prefix convention (`+`, `-`, `^`, etc.) to be parseable.

---

## 📒 Example Entries

```text
[TS] 062824-1301 | [MOD] html_ui | [ACT] +TAG | [TGT] <section class="hero"> | [VAL] id=home | [REF] index.html:22
[TS] 062824-1303 | [MOD] styles | [ACT] ^PROP | [TGT] .btn-primary > background-color | [VAL] #0055ff => #0033aa | [REF] main.css:47
[TS] 062824-1305 | [MOD] app_js | [ACT] ^FUNC | [TGT] handleFormSubmit | [VAL] added debounce | [REF] scripts/app.js:104
[TS] 062824-1307 | [MOD] api_php | [ACT] +EXC | [TGT] try-catch for DB call | [VAL] catches mysqli_sql_exception | [REF] db/api.php:78
[TS] 062824-1310 | [MOD] models_py | [ACT] ^CLASS | [TGT] UserModel | [VAL] added email validation | [REF] app/models/user.py:18
```

---

## 🪨 Advanced Tags (Optional)

These optional tags support future extensibility:

| Tag     | Purpose                                    |
| ------- | ------------------------------------------ |
| `[SEC]` | Security-related context or classification |
| `[DB]`  | Database context or table affected         |
| `[VER]` | Version or build context                   |
| `[ID]`  | Unique change ID, agent identifier, UUID   |
| `[ENV]` | Environment flag (dev/test/prod/staging)   |
| `[ERR]` | Error ID or code affected by the change    |

Example with advanced tagging:

```text
[TS] 062824-1315 | [MOD] auth | [ACT] ^STRUCT | [TGT] credentialSchema | [VAL] added=passwordSalt | [REF] schema/auth.json | [SEC] medium | [VER] 1.9.3
```

---

## ♻️ Parsing Logic (Pseudocode)

```python
def parse_ascl(entry):
    data = {}
    for part in entry.split(" | "):
        if not part.strip():
            continue
        key, val = part.split("] ", 1)
        data[key.strip("[")] = val.strip()
    return data

entry = "[TS] 062824-1305 | [MOD] comms_api | [ACT] ^FUNC | [TGT] transmitPacket | [VAL] addedRetry=true timeout=200ms | [REF] comms.js:104"
parsed = parse_ascl(entry)
print(parsed['TGT'])  # Output: transmitPacket
```

---

## 🚀 Use Cases

* Agent-to-agent communication during CI/CD deployments.
* Local-only changelog documentation for generated files.
* Synchronization of logic/data changes across distributed AI services.
* Tracking of function/data evolution in projects with limited human intervention.
* Rollback, replay, or diff generation for agent-maintained systems.
* Language-agnostic documentation of granular codebase evolution.

---

## 📆 Timestamp Format Spec

The timestamp format `MMDDYY-HHMM` includes both date and time components.

| Field | Format                             |
| ----- | ---------------------------------- |
| MM    | 2-digit month (e.g., 06 = June)    |
| DD    | 2-digit day (e.g., 28)             |
| YY    | 2-digit year (e.g., 24 = 2024)     |
| HHMM  | 24-hour time (e.g., 1305 = 1:05pm) |

---

## 📄 Template

```
[TS] <MMDDYY-HHMM>
[MOD] <module_name>
[ACT] <action_code>
[TGT] <target_changed>
[VAL] <comma-separated key=value>
[REF] <file_path[:line]>
```

---

ASCL is meant to evolve with your agents. Let humans write paragraphs. Let agents speak in protocol.

> **"ASCL is not for you. It's for the next you."**
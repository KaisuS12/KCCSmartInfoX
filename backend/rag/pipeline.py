import os
import re
import logging
from groq import Groq
from spellchecker import SpellChecker
from dotenv import load_dotenv
from rag.chroma_store import embedding_model, collection

load_dotenv()
logger = logging.getLogger("kccsmartinfox.rag")

# --- Clients ---
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Spell checker — knows KCC/Filipino terms so it never over-corrects them
spell = SpellChecker()
spell.word_frequency.load_words([
    "kcc", "kabankalan", "catholic", "college", "enrollment", "enrolment",
    "tuition", "scholarship", "registrar", "syllabi", "syllabus", "bsba",
    "bsit", "bsn", "beed", "bsed", "tor", "transcript", "credentials",
    "promissory", "miscellaneous", "prelim", "midterm", "finals",
    "cashier", "dormitory", "canteen", "chapel", "filipiniana",
    "negros", "occidental", "barangay", "help", "library",
])

PRESERVE_WORDS = {
    "kumusta", "kamusta", "musta", "po", "opo", "ate", "kuya", "sir", "mam",
    "salamat", "ingat", "kcc", "bsba", "bsit", "bsn", "beed", "bsed", "tor",
    "magandang", "umaga", "hapon", "gabi", "araw", "maraming", "naman",
    "nga", "lang", "daw", "raw", "yung", "ano", "paano",
}

# --- Prompts ---
SYSTEM_PROMPT = """You are KCCSmartInfoX, the official AI assistant of Kabankalan Catholic College (KCC).

RULES:
1. Answer using the provided context from KCC official documents.
2. If the answer is NOT in the context, say: "I don't have information about that yet. Your question has been noted for review."
3. Never fabricate specific details like fees, dates, or names not in the context.
4. Be helpful, friendly, and concise.
5. You understand Filipino-English mixed messages (Taglish/Bisaya). Always respond in clear English.

FORMATTING RULES:
- If the answer has multiple items, steps, or points — use a proper markdown list. Use "- " (dash space) for bullet points and "1. 2. 3." for numbered steps.
- NEVER use the • character. Always use "- " for bullets.
- Use a short bold heading before a list when helpful (e.g., **Requirements:**).
- If the answer is a single simple fact, one sentence or short paragraph is fine.
- Never write a wall of text. Break it up so it's easy to read on a phone screen.
- Use numbered list for steps/procedures. Use "- " bullet list for features/options/items."""

SYSTEM_PROMPT_FIL = """Ikaw si KCCSmartInfoX, ang opisyal na AI assistant ng Kabankalan Catholic College (KCC).

MGA PATAKARAN:
1. Sagutin gamit ang konteksto mula sa opisyal na mga dokumento ng KCC.
2. Kung ang sagot ay WALA sa konteksto, sabihin: "Wala pa akong impormasyon tungkol diyan. Ang iyong tanong ay naitala na para sa pagsusuri."
3. Huwag gumawa ng mga detalye tulad ng bayad, petsa, o pangalan na wala sa konteksto.
4. Maging magalang, makulay, at malinaw. Pwedeng mag-Taglish.
5. Naiintindihan mo ang Taglish, Bisaya, at Filipino na mensahe.

FORMATTING:
- Gumamit ng markdown list para sa maraming items o hakbang. Gamitin ang "- " (dash space) para sa bullets, at "1. 2. 3." para sa mga hakbang.
- HUWAG gumamit ng • character. Gamitin laging "- " para sa bullets.
- Gumamit ng maikling bold na heading bago ang listahan kung kailangan.
- Kung isang simpleng tanong lang, isang talata o pangungusap lang ang sagot.
- Huwag gumawa ng mahabang walang-break na teksto."""

GREETING_PROMPT = """You are KCCSmartInfoX, the friendly AI assistant of Kabankalan Catholic College (KCC).

Respond warmly and naturally to greetings or casual messages. Let them know you can help with:
enrollment, courses, tuition fees, scholarships, TOR requests, and school policies.
Keep it short and welcoming. Do not make up any school details."""

GREETING_PROMPT_FIL = """Ikaw si KCCSmartInfoX, ang palakaibigang AI assistant ng Kabankalan Catholic College (KCC).

Sumagot nang mainit at natural sa mga bati o casual na mensahe. Ipaalam na makakatulong ka sa:
enrollment, mga kurso, tuition fees, scholarships, TOR requests, at mga patakaran ng paaralan.
Maging maikli at masaya. Pwedeng mag-Taglish. Huwag gumawa ng mga detalye ng paaralan."""

REWRITE_PROMPT = """You are a query understanding assistant. Your job is to interpret what a student is asking, even if they have:
- typos or misspellings
- Filipino/Bisaya/Taglish words mixed in
- incomplete sentences or abbreviations
- bad grammar

Output ONLY the clean, corrected English question. Nothing else. No explanation.

Examples:
Input: "magkano ang tution fe para sa bsit?"
Output: "How much is the tuition fee for BSIT?"

Input: "pwede ba mag enrol kahit late na?"
Output: "Can I still enroll even if it is late?"

Input: "wat are the cources ofered at kcc"
Output: "What courses are offered at KCC?"

Input: "pano kumuha ng tor sa rejistrar"
Output: "How do I get a transcript of records from the registrar?"

Input: "scholarshiip requiremnts"
Output: "What are the scholarship requirements?"
"""

UNANSWERED_PHRASE = "I don't have information about that yet"

GREETING_PATTERNS = re.compile(
    r"^\s*(hi+|hello+|hey+|good\s*(morning|afternoon|evening|day)|kumusta|kamusta|sup|howdy|greetings|yo+|helo|hii+|heyyy*|"
    r"magandang\s*(umaga|hapon|gabi|araw)|musta|how are you|how r u|"
    r"thank(s| you)|salamat|maraming salamat|okay|ok|cool|nice|wow|great|noted|got it|"
    r"bye+|goodbye|see you|ingat|take care)\s*[!?.]*\s*$",
    re.IGNORECASE
)


# --- Helper Functions ---

def clean_bullets(text: str) -> str:
    """Replace any bullet characters with proper markdown list items."""
    # Covers: • · ● ▪ ◆ ◉ ○ ▸ ► and similar
    bullet_pattern = re.compile(r'[•·●▪◆◉○▸►]')
    lines = []
    for line in text.split('\n'):
        if bullet_pattern.search(line):
            parts = [p.strip() for p in bullet_pattern.split(line) if p.strip()]
            line = '\n'.join('- ' + p for p in parts)
        lines.append(line)
    return '\n'.join(lines)



def is_greeting(text: str) -> bool:
    result = bool(GREETING_PATTERNS.match(text.strip()))
    logger.info("is_greeting(%r) = %s", text, result)
    return result


def quick_spell_fix(text: str) -> str:
    """Fast word-level spell fix before LLM rewrite. Preserves Filipino/KCC words."""
    words = text.split()
    corrected = []
    for word in words:
        clean = re.sub(r"[^a-zA-Z]", "", word).lower()
        if not clean or clean in PRESERVE_WORDS or len(clean) <= 2:
            corrected.append(word)
        else:
            fixed = spell.correction(clean)
            if fixed and fixed != clean:
                corrected.append(re.sub(re.escape(clean), fixed, word, flags=re.IGNORECASE))
            else:
                corrected.append(word)
    return " ".join(corrected)


def rewrite_query(question: str) -> str:
    """
    Use LLM to understand intent from messy/typo/Taglish input.
    Returns a clean English question for embedding retrieval.
    This is the same technique used by ChatGPT/Claude for robust understanding.
    """
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": REWRITE_PROMPT},
                {"role": "user", "content": question},
            ],
            temperature=0.0,
            max_tokens=80,
        )
        clean = response.choices[0].message.content.strip()
        # Safety: if LLM returns something too long or weird, fall back
        if len(clean) > 200 or "\n" in clean:
            return question
        logger.info("Query rewritten: %r -> %r", question, clean)
        return clean
    except Exception as e:
        logger.warning("Query rewrite failed: %s", e)
        return question


# --- Main RAG Function ---

def query_rag(question: str, history: list = None, user_profile: dict = None, lang: str = "en") -> tuple:
    """Returns (answer: str, is_answered: bool, sources: list[str])"""

    history = history or []
    use_fil = lang == "fil"

    # Pick system prompt based on language
    system_prompt = SYSTEM_PROMPT_FIL if use_fil else SYSTEM_PROMPT

    # 1. Handle greetings / small talk — no RAG needed
    if is_greeting(question):
        logger.info("Greeting detected: %s", question[:80])
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": GREETING_PROMPT_FIL if use_fil else GREETING_PROMPT},
                {"role": "user", "content": question},
            ],
            temperature=0.7,
            max_tokens=150,
        )
        return response.choices[0].message.content.strip(), True, []

    # 2. Quick spell fix (fast, no API call)
    spell_fixed = quick_spell_fix(question)

    # 3. LLM query rewrite — understands Taglish, typos, abbreviations
    clean_question = rewrite_query(spell_fixed)

    # 4. Embed the clean question for semantic search
    question_embedding = embedding_model.encode(clean_question).tolist()

    doc_count = collection.count()
    if doc_count == 0:
        return "I don't have any knowledge base documents yet. Please ask the admin to upload KCC documents.", False, []

    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=min(3, doc_count),
        include=["documents", "distances", "metadatas"],
    )

    docs      = results.get("documents", [[]])[0]
    distances = results.get("distances", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]

    # 5. No relevant docs found
    if not docs or (distances and distances[0] > 1.3):
        logger.warning("No relevant context for: %s (rewritten: %s)", question[:60], clean_question[:60])
        return UNANSWERED_PHRASE + ". Your question has been noted for review.", False, []

    # Truncate each chunk to ~150 words to stay within Groq's free-tier token limit
    def trim(text, max_words=150):
        words = text.split()
        return " ".join(words[:max_words]) + ("..." if len(words) > max_words else "")

    context = "\n\n---\n\n".join(trim(d) for d in docs)

    # Extract unique source filenames from metadata
    seen = set()
    sources = []
    for meta in metadatas:
        src = meta.get("source", "") if meta else ""
        if src and src not in seen:
            seen.add(src)
            sources.append(src)

    # 6. Build messages: system + recent history (last 3 pairs) + current RAG question
    messages = [{"role": "system", "content": system_prompt}]
    messages += history[-4:]   # last 2 user/assistant pairs
    messages.append({
        "role": "user",
        "content": (
            f"Context from KCC documents:\n\n{context}\n\n"
            f"Student's question: {question}\n"
            f"(Interpreted as: {clean_question})"
        ),
    })

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        temperature=0.2,
        max_tokens=400,
    )

    answer      = clean_bullets(response.choices[0].message.content.strip())
    is_answered = UNANSWERED_PHRASE not in answer

    logger.info("Answered=%s | original: %s | clean: %s", is_answered, question[:50], clean_question[:50])
    return answer, is_answered, sources

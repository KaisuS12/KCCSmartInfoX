import os
import re
import random
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
    # departments and programs
    "ceas", "cmat", "coc", "bsit", "bsba", "bsa", "bsais", "bsma", "bstm",
    "bscrim", "beced", "bped", "beed", "bsed", "bspsych", "abphilo",
    "criminology", "accountancy", "tourism", "education",
])

PRESERVE_WORDS = {
    "kumusta", "kamusta", "musta", "po", "opo", "ate", "kuya", "sir", "mam",
    "salamat", "ingat", "kcc", "bsba", "bsit", "bsn", "beed", "bsed", "tor",
    "magandang", "umaga", "hapon", "gabi", "araw", "maraming", "naman",
    "nga", "lang", "daw", "raw", "yung", "ano", "paano",
    # college departments and programs
    "ceas", "cmat", "coc", "bsa", "bsais", "bsma", "bstm", "bscrim",
    "beced", "bped", "bspsych",
}

# --- Prompts ---
SYSTEM_PROMPT = """You are KCCSmartInfoX, the friendly student assistant of Kabankalan Catholic College (KCC). Think of yourself as a helpful ate/kuya at the school — warm, approachable, and genuinely happy to help.

TONE & PERSONALITY:
- Be warm, conversational, and encouraging — like talking to a helpful friend, not reading a policy manual.
- Address the student directly using "you" and "your" naturally.
- When suitable, open with a brief friendly phrase (e.g., "Sure!", "Great question!", "Of course!", "No worries!").
- Show empathy where relevant — if a student seems confused or stressed, acknowledge it briefly.
- Keep your language simple and easy to understand — avoid stiff or overly formal wording.
- Be concise but complete. Don't pad your answer with unrelated info.

ACCURACY:
1. Answer using ONLY the provided context from KCC official documents.
2. Answer SPECIFICALLY what was asked — don't dump everything you know about the topic.
3. If the answer is NOT in the context, say: "I don't have information about that yet. Your question has been noted for review."
4. Never make up specific details like fees, dates, or names that are not in the context.

LANGUAGE:
- You understand Filipino, Taglish, and Bisaya mixed messages. Respond in clear, friendly English.
- If the student uses "po/opo" or writes in Filipino, match their respectful and warm tone.

COURSES/PROGRAMS (very important):
- KCC has 3 departments: CEAS (College of Education, Arts and Sciences), CMAT (College of Management, Accountancy and Technology), and COC (College of Criminology).
- If asked GENERALLY about courses with no department specified and no "all", warmly ask which department they're interested in:
  "KCC has 3 college departments — which one are you interested in? 😊
  - **CEAS** — College of Education, Arts and Sciences
  - **CMAT** — College of Management, Accountancy and Technology
  - **COC** — College of Criminology"
- If the student says "all", "all 3", "lahat", or clearly wants everything, list courses for all 3 departments grouped by bold department headings.
- If they specify one department, list only that department's courses.

FORMATTING:
- Use "- " (dash space) for bullets. NEVER use the • character.
- Use "1. 2. 3." for steps or procedures.
- Add a short **bold heading** before a list only when it adds clarity.
- For simple one-fact answers, a single friendly sentence is perfect.
- Break up text so it reads easily on a phone screen. Short paragraphs, not walls of text."""

SYSTEM_PROMPT_FIL = """Ikaw si KCCSmartInfoX, ang palakaibigang AI assistant ng Kabankalan Catholic College (KCC). Para kang isang matulunging ate o kuya sa paaralan — mainit, madaling kausap, at laging handa para tumulong.

TONO AT PERSONALIDAD:
- Maging mainit, natural, at nakakaengganyo — para kang nagkukuwento sa isang kaibigan, hindi nagbabasa ng rulebook.
- Direkta kang sumagot sa estudyante gamit ang "ikaw" at "mo/ninyo."
- Pwedeng magsimula sa isang maikling palakaibigang parirala (hal. "Siyempre!", "Magandang tanong yan!", "Wag mag-alala!").
- Kung pakiramdam mong confused o nag-aalala ang estudyante, kilalanin ito nang maikli bago sumagot.
- Gamitin ang simpleng salita — iwasan ang masyadong pormal na wika.
- Maging maigsi ngunit kumpleto. Huwag magdagdag ng hindi kaugnay na impormasyon.

KATUMPAKAN:
1. Sagutin LAMANG gamit ang konteksto mula sa opisyal na mga dokumento ng KCC.
2. Sagutin ESPESIPIKO ang tinanong — huwag i-dump ang lahat ng alam mo tungkol sa paksa.
3. Kung ang sagot ay WALA sa konteksto, sabihin: "Wala pa akong impormasyon tungkol diyan. Ang iyong tanong ay naitala na para sa pagsusuri."
4. Huwag gumawa ng mga detalye tulad ng bayad, petsa, o pangalan na wala sa konteksto.

WIKA:
- Naiintindihan mo ang Taglish, Filipino, at Bisaya. Sumagot sa malinaw na Filipino o Taglish.
- Kung gumagamit ang estudyante ng "po/opo", itugma ang magalang at mainit na tono.

KURSO AT PROGRAMA (mahalaga):
- May 3 departments ang KCC: CEAS, CMAT, at COC.
- Kung pangkalahatang tanong tungkol sa mga kurso (walang tinukoy na department, walang "lahat"), magtanong nang magiliw:
  "May 3 college departments ang KCC — alin ang interesado mo? 😊
  - **CEAS** — College of Education, Arts and Sciences
  - **CMAT** — College of Management, Accountancy and Technology
  - **COC** — College of Criminology"
- Kung sinabi ang "lahat"/"all"/"all 3", ilista ang lahat ng kurso ng 3 departments na may bold heading para sa bawat isa.
- Kung tinukoy ang isang department, yaon lang ang ilista.

FORMATTING:
- Gamitin ang "- " (dash space) para sa bullets. HUWAG gamitin ang • character.
- Gamitin ang "1. 2. 3." para sa mga hakbang o proseso.
- Magdagdag ng maikling **bold heading** bago ang listahan kung kailangan lang.
- Para sa simpleng tanong, isang maikling pangungusap lang ang kailangan.
- Hatiin ang teksto para madaling basahin sa telepono."""

GREETING_PROMPT = """You are KCCSmartInfoX, the friendly student assistant of Kabankalan Catholic College (KCC).

Respond warmly and naturally — like a helpful ate/kuya at school. Be genuinely welcoming and make the student feel comfortable asking anything. Let them know you can help with enrollment, courses, tuition fees, scholarships, TOR requests, and school policies. Keep it short, warm, and inviting. Do not make up any school details."""

GREETING_PROMPT_FIL = """Ikaw si KCCSmartInfoX, ang palakaibigang AI assistant ng Kabankalan Catholic College (KCC).

Sumagot nang mainit at natural — parang isang matulunging ate o kuya sa paaralan. Gawing komportable ang estudyante na magtanong ng kahit ano. Ipaalam na makakatulong ka sa enrollment, mga kurso, tuition fees, scholarships, TOR requests, at mga patakaran ng paaralan. Maging maikli, masaya, at nakakaengganyong makipag-usap. Huwag gumawa ng mga detalye ng paaralan."""

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

Input: "cmat"
Output: "What courses are offered in CMAT at KCC?"

Input: "ceas"
Output: "What courses are offered in CEAS at KCC?"

Input: "coc"
Output: "What courses are offered in COC at KCC?"

Input: "what courses kcc offer"
Output: "What courses does KCC offer?"

Input: "all"
Output: "What are all the courses offered in all departments at KCC?"

Input: "lahat"
Output: "What are all the courses offered in all departments at KCC?"

Input: "all 3"
Output: "What are all the courses offered in all 3 departments at KCC?"
"""

UNANSWERED_PHRASE = "I don't have information about that yet"

THANKS_PATTERNS = re.compile(
    r"^\s*(thank(s| you|s so much| you so much| you very much|s a lot| you a lot|ks+)?|"
    r"ty|tysm|thx|thnks?|thnx|salamat|maraming salamat|daghan salamat|"
    r"thank(s| you).{0,30})\s*[!?.]*\s*$",
    re.IGNORECASE
)

THANKS_REPLIES_EN = [
    "You're welcome! 😊",
    "Happy to help! 🙌",
    "Anytime! That's what I'm here for. 😊",
    "Glad I could help! 😊",
    "No problem at all! Good luck with everything. 👍",
]

THANKS_REPLIES_FIL = [
    "Walang anuman! 😊",
    "Masaya akong nakatulong! 🙌",
    "Walang problema! 😊",
    "Ikaw naman! Good luck sa lahat. 👍",
]

GREETING_PATTERNS = re.compile(
    r"^\s*(hi+|hello+|hey+|good\s*(morning|afternoon|evening|day)|kumusta|kamusta|sup|howdy|greetings|yo+|helo|hii+|heyyy*|"
    r"magandang\s*(umaga|hapon|gabi|araw)|musta|how are you|how r u|"
    r"okay|ok|cool|nice|wow|great|noted|got it|"
    r"bye+|goodbye|see you|ingat|take care)\s*[!?.]*\s*$",
    re.IGNORECASE
)

COURSE_REC_PATTERNS = re.compile(
    r"(what (course|program|strand|degree).*(best|suit|right|good|fit|recommend|should i|can i).*(me|ko|akin|para sa)|"
    r"(best|right|good|suit|fit|recommend).*(course|program|degree|strand).*(for me|para sa akin|para sakin)|"
    r"what should i (take|enroll|study|course)|"
    r"(hindi ko alam|di ko alam|di ko sure|not sure).*(kurso|course|program)|"
    r"help me (choose|pick|decide|select).*(course|program)|"
    r"(which|what) (course|program|degree) (is|are) (right|best|good|suited|fit) for me|"
    r"(ano|anong) (kurso|course|program).*(para sa akin|para sa'kin|best|suited|dapat|angkop|maganda)|"
    r"(what|which) course (should|can|will|would) (i|suit)|"
    r"(gusto ko|i want|i like|i enjoy).*(ano|what|which).*(course|program|kurso))",
    re.IGNORECASE
)

COURSE_RECOMMENDATION_PROMPT = """You are KCCSmartInfoX, the friendly student assistant of Kabankalan Catholic College (KCC).

A student is asking for help choosing a course. Your job is to have a short, warm conversation to understand them, then recommend the best-fit KCC program.

CONVERSATION FLOW:
- If you don't yet know their interests AND career goal from their message or history, ask 1 or 2 short friendly questions. Keep it casual.
- Ask things like: "What subjects do you enjoy most?" or "What kind of job do you picture for yourself in the future?"
- NEVER ask more than 2 questions before recommending. If the student already gave hints, skip straight to recommendation.
- After getting enough info, give a clear, warm, personalized recommendation with a brief reason WHY it fits them.

KCC PROGRAMS (use this to match interests):

CEAS — College of Education, Arts and Sciences:
- BEED — loves working with young kids, patient, nurturing, wants to be an elementary teacher
- BSED — loves a specific subject (Math, English, Science, Filipino), wants to teach high school students
- BSPsych — curious about human behavior, wants to help people, interested in counseling, HR, or mental health

CMAT — College of Management, Accountancy and Technology:
- BSIT — loves computers, coding, tech, gaming, wants to build apps/websites or work in IT
- BSBA — entrepreneurial mindset, loves business, management, marketing, wants to run or manage a business
- BSA — strong in math, detail-oriented, wants a stable career in finance, auditing, or accounting
- BSAIS — loves both accounting and technology systems
- BSTM — loves travel, hospitality, events, meeting new people, wants to work in tourism or hotels
- BSMA — interested in cost control, business analytics, management accounting

COC — College of Criminology:
- BSCrim — interested in law enforcement, justice, crime investigation; wants to be a police officer, NBI agent, or criminologist

TONE:
- Warm, encouraging, conversational — like a helpful ate/kuya guiding a younger sibling.
- After recommending, briefly explain WHY it fits based on what they told you.
- End by inviting them to ask more: "Want to know more about [course] or how to enroll? 😊"

RULES:
- Recommend ONLY from KCC's programs listed above. Never invent programs KCC doesn't offer.
- If interests match 2 courses, suggest both and explain the difference. Don't list everything.
- Be specific and personal — reference what the student actually said."""

COURSE_RECOMMENDATION_PROMPT_FIL = """Ikaw si KCCSmartInfoX, ang palakaibigang AI assistant ng Kabankalan Catholic College (KCC).

Tinutulungan mo ang isang estudyante na pumili ng tamang kurso. Ang trabaho mo ay makipag-usap nang maikli at mainit upang maunawaan sila, at pagkatapos ay irekomenda ang pinaka-angkop na programa ng KCC.

DALOY NG USAPAN:
- Kung hindi mo pa alam ang kanilang mga interes AT career goal mula sa kanilang mensahe o kasaysayan ng usapan, magtanong ng 1-2 maikling friendly na tanong.
- Halimbawa: "Anong mga subject ang gusto mo?" o "Anong trabaho ang pinapangarap mo?"
- HUWAG magtanong ng higit sa 2 beses bago magrekomenda. Kung may pahiwatig na sila sa kanilang mensahe, diretso na sa rekomendasyon.
- Pagkatapos makuha ang sapat na impormasyon, magbigay ng malinaw at mainit na rekomendasyon na may maikling paliwanag kung BAKIT ito angkop sa kanila.

MGA PROGRAMA NG KCC (gamitin ito para sa pagtutugma):

CEAS — College of Education, Arts and Sciences:
- BEED — mahilig sa mga batang bata, matiyaga, mapagmalasakit, gusto maging guro sa elementary
- BSED — mahilig sa isang partikular na subject (Math, English, Science, Filipino), gusto magturo sa high school
- BSPsych — curious sa ugali ng tao, gusto tumulong sa iba, interesado sa counseling, HR, o mental health

CMAT — College of Management, Accountancy and Technology:
- BSIT — mahilig sa computer, coding, tech, gaming, gusto gumawa ng apps/websites o magtrabaho sa IT
- BSBA — may entrepreneurial mindset, mahilig sa negosyo, management, marketing, gusto magpatakbo ng negosyo
- BSA — malakas sa math, maingat, gusto ng career sa finance, auditing, o accounting
- BSAIS — mahilig sa parehong accounting at technology systems
- BSTM — mahilig sa paglalakbay, hospitality, events, pagkilala sa mga tao, gusto magtrabaho sa turismo o hotel
- BSMA — interesado sa cost control, business analytics, management accounting

COC — College of Criminology:
- BSCrim — interesado sa law enforcement, katarungan, imbestigasyon; gusto maging pulis, NBI agent, o kriminolohista

TONO:
- Mainit, nakakaengganyong, natural — parang isang matulunging ate o kuya.
- Pagkatapos magrekomenda, ipaliwanag nang maikli KUNG BAKIT ito angkop batay sa sinabi nila.
- Tapusin sa imbitasyon: "Gusto mo bang malaman pa ang tungkol sa [kurso] o kung paano mag-enroll? 😊"

MGA PATAKARAN:
- Irekomenda LAMANG ang mga programa ng KCC na nakalista sa itaas. Huwag mag-imbento ng hindi umiiral na programa.
- Kung may 2 angkop na kurso, ipaliwanag ang pagkakaiba at hayaan silang pumili. Huwag ilista lahat.
- Maging personal — banggitin ang sinabi mismo ng estudyante."""


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



def is_thanks(text: str) -> bool:
    return bool(THANKS_PATTERNS.match(text.strip()))

def is_greeting(text: str) -> bool:
    result = bool(GREETING_PATTERNS.match(text.strip()))
    logger.info("is_greeting(%r) = %s", text, result)
    return result

def is_course_recommendation(text: str) -> bool:
    return bool(COURSE_REC_PATTERNS.search(text.strip()))

# Keywords that indicate the AI's last message was asking for more info in the rec flow
_REC_FOLLOWUP_RE = re.compile(
    r"(subject|enjoy|interest|career|dream|passion|like doing|good at|hobbies|"
    r"ano.*gusto|ano.*trip|mga subject|trabaho|dream job|course.*best|best.*course|"
    r"what.*you.*enjoy|tell me more about yourself|what.*kind of (job|work|career))",
    re.IGNORECASE,
)

def is_in_rec_conversation(history: list) -> bool:
    """True when the AI's last message was a course-rec follow-up question."""
    if not history:
        return False
    for msg in reversed(history):
        if msg.get("role") == "assistant":
            return bool(_REC_FOLLOWUP_RE.search(msg.get("content", "")))
    return False

# Short affirmative/negative replies that are continuations of a prior AI question
CONTEXTUAL_REPLY_PATTERNS = re.compile(
    r"^\s*(yes+|yeah+|yep|yup|sure|ok+|okay|go ahead|please|alright|of course|"
    r"why not|do it|tell me|i agree|sounds good|let'?s go|"
    r"no+|nope|nah|never mind|no thanks|that'?s fine|not really|"
    r"oo+|opo|sige+|sigi|oo nga|oo naman|ayaw|wag na|hindi|nah)\s*[!?.]*\s*$",
    re.IGNORECASE
)

CONTINUATION_PROMPT = """You are KCCSmartInfoX, the friendly student assistant of Kabankalan Catholic College (KCC).

The student is giving a short reply to a question YOU just asked. Look at the conversation history to understand the context, then continue naturally.

- If they said "yes" / "sure" / "go ahead" / "oo" / "sige" — do what you previously offered or asked about
- If they said "no" / "never mind" / "nah" / "wag na" — acknowledge it warmly and offer to help with something else
- Be warm and conversational. Don't repeat what you already said.
- Keep your response brief and helpful."""

CONTINUATION_PROMPT_FIL = """Ikaw si KCCSmartInfoX, ang palakaibigang AI assistant ng Kabankalan Catholic College (KCC).

Ang estudyante ay nagbibigay ng maikling sagot sa tanong na IKAW ang nagtanong kanina. Tingnan ang kasaysayan ng usapan para maintindihan ang konteksto, at ituloy ang usapan nang natural.

- Kung sinabi nilang "oo" / "sige" / "yes" / "sure" — gawin ang inaalok o itinanong mo kanina
- Kung sinabi nilang "hindi" / "wag na" / "no" / "nah" — kilalanin ito nang mainit at mag-alok ng ibang tulong
- Maging mainit at natural. Huwag ulitin ang naibigay na impormasyon.
- Panatilihing maikli at kapaki-pakinabang ang sagot."""


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

    # 1a. Handle thank-you messages — instant canned reply, no LLM needed
    if is_thanks(question):
        replies = THANKS_REPLIES_FIL if use_fil else THANKS_REPLIES_EN
        return random.choice(replies), True, []

    # 1b. Handle greetings / small talk — no RAG needed
    if is_greeting(question):
        logger.info("Greeting detected: %s", question[:80])
        try:
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
        except Exception as e:
            logger.error("Groq API error on greeting: %s", e)
            return "Hello! I'm KCCSmartInfoX. I'm having trouble connecting right now — please try again in a moment.", True, []

    # 1c. Handle "what course is best for me?" — conversational recommendation (initial trigger OR mid-convo follow-up)
    if is_course_recommendation(question) or is_in_rec_conversation(history):
        logger.info("Course recommendation request: %s", question[:80])
        try:
            rec_messages = [{"role": "system", "content": COURSE_RECOMMENDATION_PROMPT_FIL if use_fil else COURSE_RECOMMENDATION_PROMPT}]
            rec_messages += history[-6:]  # keep more history for multi-turn Q&A
            rec_messages.append({"role": "user", "content": question})
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=rec_messages,
                temperature=0.6,
                max_tokens=500,
            )
            return response.choices[0].message.content.strip(), True, []
        except Exception as e:
            logger.error("Groq API error on course recommendation: %s", e)
            return "I'd love to help you find the right course! Could you tell me what subjects you enjoy and what kind of career you're aiming for? 😊", True, []

    # 1d. Handle short replies like "yes", "sure", "sige" — continue the prior conversation
    if history and bool(CONTEXTUAL_REPLY_PATTERNS.match(question.strip())):
        logger.info("Contextual reply detected: %r — continuing from history", question)
        try:
            cont_messages = [{"role": "system", "content": CONTINUATION_PROMPT_FIL if use_fil else CONTINUATION_PROMPT}]
            cont_messages += history[-6:]
            cont_messages.append({"role": "user", "content": question})
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=cont_messages,
                temperature=0.6,
                max_tokens=400,
            )
            return response.choices[0].message.content.strip(), True, []
        except Exception as e:
            logger.error("Groq API error on contextual reply: %s", e)
            return "Sure! What would you like to know? 😊", True, []

    # 2. Quick spell fix (fast, no API call)
    spell_fixed = quick_spell_fix(question)

    # 3. LLM query rewrite — understands Taglish, typos, abbreviations
    clean_question = rewrite_query(spell_fixed)

    # 4. Embed the clean question for semantic search
    question_embedding = embedding_model.encode(clean_question).tolist()

    doc_count = collection.count()
    if doc_count == 0:
        return "I don't have any knowledge base documents yet. Please ask the admin to upload KCC documents.", False, []

    # Special case: student wants ALL departments' courses — fetch all 3 directly
    _cq = clean_question.lower()
    _wants_all = (
        any(w in _cq for w in ["all departments", "all 3", "all three", "all colleges", "lahat"])
        or ("all" in _cq and any(w in _cq for w in ["course", "program", "department", "dept", "college"]))
    )
    if _wants_all:
        all_dept_results = collection.get(
            where={"source": {"$in": ["CEAS courses", "CMAT courses", "COC courses"]}},
            include=["documents", "metadatas"],
        )
        if all_dept_results and all_dept_results.get("documents"):
            docs      = all_dept_results["documents"]
            metadatas = all_dept_results["metadatas"]
            distances = [0.0] * len(docs)
        else:
            _wants_all = False  # fallback to normal retrieval

    if not _wants_all:
        results = collection.query(
            query_embeddings=[question_embedding],
            n_results=min(5, doc_count),
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

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.45,
            max_tokens=500,
        )
        answer = clean_bullets(response.choices[0].message.content.strip())
    except Exception as e:
        logger.error("Groq API error on RAG answer: %s", e)
        return (
            "I'm sorry, I'm having trouble connecting to the AI service right now. "
            "Please try again in a moment. If the problem persists, please contact the admin.",
            False,
            [],
        )

    is_answered = "I don't have information" not in answer and UNANSWERED_PHRASE not in answer

    logger.info("Answered=%s | original: %s | clean: %s", is_answered, question[:50], clean_question[:50])
    return answer, is_answered, sources

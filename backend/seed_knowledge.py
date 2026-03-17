import requests

r = requests.post('http://localhost:8000/api/admin/login', json={'username':'admin','password':'admin123'})
token = r.json().get('token','')
headers = {'Authorization': f'Bearer {token}'}

entries = [
    {
        'source': 'Enrollment Requirements',
        'content': (
            "Enrollment Requirements at Kabankalan Catholic College (KCC):\n\n"
            "For New Students (Grade 7 / Grade 11 / College Freshmen):\n"
            "- Original and photocopy of PSA Birth Certificate\n"
            "- Original Form 138 (Report Card) with LRN\n"
            "- Certificate of Good Moral Character from previous school\n"
            "- 2 pieces 2x2 ID photos (white background)\n"
            "- Accomplished KCC Enrollment Form\n\n"
            "For Transferee Students:\n"
            "- Original Transcript of Records (TOR)\n"
            "- Honorable Dismissal from previous school\n"
            "- Certificate of Good Moral Character\n"
            "- PSA Birth Certificate\n"
            "- 2 pieces 2x2 ID photos\n\n"
            "For Returning Students:\n"
            "- Previous KCC Report Card or Grade Slip\n"
            "- Certificate of Good Moral Character (if required)\n"
            "- 2 pieces 2x2 ID photos\n\n"
            "Enrollment period is usually held every June for the first semester and October/November for the second semester."
        )
    },
    {
        'source': 'Tuition and Fees',
        'content': (
            "Tuition and Fees at Kabankalan Catholic College (KCC):\n\n"
            "College Tuition Fee: Php 250 to Php 350 per unit depending on the course.\n"
            "Miscellaneous Fees: Approximately Php 3,000 to Php 5,000 per semester.\n"
            "Laboratory Fee: Varies per subject (Php 500 to Php 1,500 per lab subject).\n\n"
            "Basic Education (JHS and SHS):\n"
            "- JHS: Covered by DepEd voucher for eligible students\n"
            "- SHS: Covered by DepEd SHS voucher program\n\n"
            "Payment Options:\n"
            "- Full payment with 5% discount if paid before enrollment\n"
            "- Installment: 50% upon enrollment, 25% midterm, 25% finals\n"
            "- Scholarship and financial assistance available for qualified students\n\n"
            "For exact tuition rates per course, visit the Registrar or Finance Office at KCC."
        )
    },
    {
        'source': 'School Schedule and Office Hours',
        'content': (
            "KCC School Schedule and Office Hours:\n\n"
            "Academic Year: June to March (two semesters)\n"
            "First Semester: June - October\n"
            "Second Semester: November - March\n"
            "Summer: April - May (select courses only)\n\n"
            "Class Hours:\n"
            "- Morning: 7:00 AM - 12:00 PM\n"
            "- Afternoon: 1:00 PM - 5:00 PM\n"
            "- Evening: 5:30 PM - 9:00 PM (for working students, select programs)\n\n"
            "Office Hours:\n"
            "- Monday to Friday: 8:00 AM - 5:00 PM\n"
            "- Saturday: 8:00 AM - 12:00 PM (during enrollment)\n"
            "- Closed on Sundays and holidays\n\n"
            "KCC is located at Kabankalan City, Negros Occidental, Philippines.\n"
            "Contact: (034) 471-2345 | info@kcc.edu.ph"
        )
    },
    {
        'source': 'Courses and Programs Offered',
        'content': (
            "Courses and Programs Offered at KCC:\n\n"
            "COLLEGE PROGRAMS:\n"
            "- Bachelor of Science in Business Administration (BSBA)\n"
            "- Bachelor of Science in Accountancy (BSA)\n"
            "- Bachelor of Science in Information Technology (BSIT)\n"
            "- Bachelor of Science in Computer Science (BSCS)\n"
            "- Bachelor of Science in Education (BSEd)\n"
            "- Bachelor of Elementary Education (BEEd)\n"
            "- Bachelor of Science in Nursing (BSN)\n"
            "- Bachelor of Science in Criminology (BSCrim)\n"
            "- Bachelor of Science in Social Work (BSSW)\n"
            "- Bachelor of Arts in Communication (BAC)\n"
            "- Bachelor of Science in Hotel and Restaurant Management (BSHRM)\n"
            "- Bachelor of Science in Tourism Management (BSTM)\n\n"
            "SENIOR HIGH SCHOOL TRACKS:\n"
            "- Academic Track (STEM, ABM, HUMSS, GAS)\n"
            "- Technical-Vocational-Livelihood (TVL) Track\n"
            "- Sports Track\n"
            "- Arts and Design Track\n\n"
            "JUNIOR HIGH SCHOOL: Grade 7 to Grade 10\n\n"
            "KCC is a CHED-recognized and PACUCOA-accredited institution founded in 1927."
        )
    },
    {
        'source': 'Scholarship and Financial Assistance',
        'content': (
            "Scholarships and Financial Assistance at KCC:\n\n"
            "Government Scholarships:\n"
            "- CHED UniFAST / TDP (Tertiary Education Subsidy)\n"
            "- DepEd SHS Voucher for Senior High School students\n"
            "- PESFA (Private Education Student Financial Assistance)\n"
            "- GASTPE (Government Assistance to Students in Private Education)\n\n"
            "KCC Institutional Scholarships:\n"
            "- Academic Excellence Scholarship: GWA of 1.5 or better\n"
            "- Athletic Scholarship: for varsity athletes\n"
            "- Music/Arts Scholarship: for students with exceptional talent\n"
            "- Sibling Discount: 10% discount for siblings both enrolled at KCC\n\n"
            "Other Assistance:\n"
            "- Working Student Program: part-time work in exchange for tuition reduction\n"
            "- Student Loan Program: short-term loans for students in financial difficulty\n\n"
            "To apply, visit the Student Affairs Office (SAO) and submit:\n"
            "- Application form, latest grades, certificate of financial need, income certificate"
        )
    },
    {
        'source': 'Registrar and TOR Request',
        'content': (
            "Registrar Office Services at KCC:\n\n"
            "Documents Available:\n"
            "- Transcript of Records (TOR)\n"
            "- Certificate of Enrollment\n"
            "- Certificate of Graduation\n"
            "- Diploma (original and replacement)\n"
            "- Form 137 / Form 138\n\n"
            "How to Request TOR:\n"
            "1. Fill out request form at the Registrar Office\n"
            "2. Pay fee at the Finance/Cashier Office: Php 150 per copy\n"
            "3. Processing time: Regular 3-5 working days, Rush 1-2 working days\n"
            "4. Claim with official receipt\n\n"
            "Requirements for TOR:\n"
            "- Clearance from all departments (Library, Finance, Student Affairs)\n"
            "- Official receipt of payment\n"
            "- 1 piece 2x2 ID photo\n\n"
            "Office: Ground Floor, Administration Building | Mon-Fri 8AM-5PM"
        )
    },
    {
        'source': 'Student Discipline and Code of Conduct',
        'content': (
            "KCC Student Discipline and Code of Conduct:\n\n"
            "General Rules:\n"
            "- Wear prescribed KCC uniform at all times within campus\n"
            "- ID must be worn visibly inside the campus\n"
            "- Smoking, drinking, and illegal substances strictly prohibited\n"
            "- Respect all members of the KCC community\n\n"
            "Uniform Policy:\n"
            "- College: White polo with KCC logo, black pants/skirt, black shoes\n"
            "- JHS/SHS: Prescribed uniform per year level\n"
            "- PE uniform required during PE classes\n\n"
            "Disciplinary Actions:\n"
            "- Minor offenses: Written warning, community service\n"
            "- Major offenses: Suspension (3-10 days)\n"
            "- Grave offenses: Dismissal or expulsion\n\n"
            "Grounds for Dismissal: Cheating, illegal drugs, physical assault, theft.\n\n"
            "Concerns: Report to Office of Student Affairs (OSA) or Dean of Students."
        )
    },
    {
        'source': 'About KCC',
        'content': (
            "About Kabankalan Catholic College (KCC):\n\n"
            "KCC is a private Catholic educational institution in Kabankalan City, Negros Occidental, Philippines. "
            "Founded in 1927, it has been providing quality education for nearly a century.\n\n"
            "Vision: A center of integral formation developing morally upright, academically excellent, and socially responsible individuals.\n\n"
            "Mission: Provide quality and affordable Catholic education nurturing the total development of students.\n\n"
            "Core Values: Faith, Excellence, Service, Integrity\n\n"
            "Motto: Teach Ye All Nations (Matthew 28:19)\n\n"
            "Accreditation: CHED-recognized and PACUCOA-accredited.\n\n"
            "Address: KCC Campus, Kabankalan City, Negros Occidental, Philippines\n"
            "Phone: (034) 471-2345\n"
            "Email: info@kcc.edu.ph"
        )
    },
]

for entry in entries:
    res = requests.post('http://localhost:8000/api/admin/knowledge/text',
        headers=headers,
        json=entry
    )
    print(f"{entry['source']}: {res.status_code} - {res.json().get('message', res.text)}")

print("\nDone! Total entries added:", len(entries))

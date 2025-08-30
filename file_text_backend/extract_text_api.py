from flask import Flask, request, jsonify
import logging
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set up logging to file and console
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.FileHandler("backend.log"),
        logging.StreamHandler()
    ]
)

app = Flask(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Try to import optional dependencies
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    logging.warning("PyMuPDF (fitz) not available. PDF extraction will be limited.")
    PYMUPDF_AVAILABLE = False

try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    logging.warning("python-docx not available. DOCX extraction will be limited.")
    DOCX_AVAILABLE = False

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    logging.warning("pandas not available. CSV extraction will be limited.")
    PANDAS_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
    if not OPENROUTER_API_KEY:
        logging.warning("OPENROUTER_API_KEY not found in environment. AI analysis will be disabled. Set it in environment or .env file to enable AI analysis.")
        OPENAI_AVAILABLE = False
except ImportError:
    logging.warning("openai not available. AI analysis will be limited.")
    OPENAI_AVAILABLE = False

def extract_pdf_text(file_path):
    if not PYMUPDF_AVAILABLE:
        return "PDF extraction not available. PyMuPDF not installed."
    
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def extract_docx_text(file_path):
    if not DOCX_AVAILABLE:
        return "DOCX extraction not available. python-docx not installed."
    
    doc = docx.Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs])

def extract_csv_text(file_path):
    if not PANDAS_AVAILABLE:
        return "CSV extraction not available. pandas not installed."
    
    df = pd.read_csv(file_path)
    return df.to_string(index=False)

def extract_txt_text(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

def get_real_jobs():
    try:
        import requests
        resp = requests.get(
            "https://active-jobs-db.p.rapidapi.com/active-ats-expired",
            headers={
                "x-rapidapi-host": "active-jobs-db.p.rapidapi.com",
                "x-rapidapi-key": "110cb01833mshbfdfb426aeb553ep16ca7djsne8349d32c68b"
            }
        )
        jobs = resp.json().get("data", [])
        trimmed_jobs = [
            {
                "id": str(job.get("job_id", "")),
                "title": job.get("job_title", ""),
                "company": job.get("company", job.get("job_company", "")),
                "tags": job.get("job_tags", [])
            }
            for job in jobs[:20]
        ]
    except Exception:
        trimmed_jobs = []
    # Fallback static jobs if API fails or returns none
    if not trimmed_jobs:
        trimmed_jobs = [
            {"id": "1", "title": "Software Engineer", "company": "DemoCorp", "tags": ["JavaScript", "React", "Node.js"]},
            {"id": "2", "title": "Backend Engineer", "company": "DataCorp", "tags": ["Python", "Django", "Flask"]},
            {"id": "3", "title": "Frontend Developer", "company": "Webify", "tags": ["HTML", "CSS", "JavaScript"]},
            {"id": "4", "title": "DevOps Engineer", "company": "CloudWorks", "tags": ["Docker", "Kubernetes", "AWS"]},
            {"id": "5", "title": "Full Stack Developer", "company": "DevSolutions", "tags": ["JavaScript", "Python", "Node.js", "React"]}
        ]
    return trimmed_jobs

@app.route('/health', methods=['GET'])
def health_check():
    """Simple endpoint to check if the API is running"""
    return jsonify({
        "status": "ok",
        "version": "1.0",
        "dependencies": {
            "pymupdf": PYMUPDF_AVAILABLE,
            "docx": DOCX_AVAILABLE,
            "pandas": PANDAS_AVAILABLE,
            "openai": OPENAI_AVAILABLE
        }
    })

@app.route('/extract-text', methods=['POST'])
def extract_text():
    try:
        file = request.files['file']
        filename = file.filename.lower()
        temp_path = f"/tmp/{file.filename}"
        
        # Ensure /tmp directory exists
        os.makedirs("/tmp", exist_ok=True)
        
        file.save(temp_path)
        logging.info(f"Saved file {filename} to {temp_path}")

        try:
            if filename.endswith('.pdf'):
                text = extract_pdf_text(temp_path)
            elif filename.endswith('.docx'):
                text = extract_docx_text(temp_path)
            elif filename.endswith('.csv'):
                text = extract_csv_text(temp_path)
            elif filename.endswith('.txt'):
                text = extract_txt_text(temp_path)
            else:
                return jsonify({"error": "Unsupported file type"}), 400
        except Exception as e:
            logging.error(f"Error extracting text: {str(e)}")
            return jsonify({"error": f"Error extracting text: {str(e)}"}), 500
        finally:
            try:
                os.remove(temp_path)
            except:
                pass

        return jsonify({"text": text})
    except Exception as e:
        logging.error(f"Error in extract-text endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/analyze-resume', methods=['POST'])
def analyze_resume():
    try:
        data = request.json
        resume_text = data.get('resume_text', '')
        jobs = get_real_jobs()

        if not OPENAI_AVAILABLE:
            # Return mock data if OpenAI is not available
            mock_result = {
                "overallSummary": "Resume analysis completed successfully",
                "overallScore": 7,
                "strengths": [
                    "Well-structured resume",
                    "Good skills section",
                    "Detailed work experience"
                ],
                "areasForImprovement": [
                    "Add more quantifiable achievements",
                    "Tailor resume to specific job applications"
                ],
                "sections": [
                    {
                        "sectionName": "Work Experience",
                        "score": 8,
                        "summary": "Good work experience section",
                        "strengths": ["Detailed role descriptions"],
                        "weaknesses": ["Could use more metrics"],
                        "suggestions": ["Add quantifiable achievements"]
                    }
                ],
                "keySkills": [
                    {
                        "skill": "Python",
                        "score": 7,
                        "evidence": "Listed in skills section"
                    }
                ],
                "jobMatches": [
                    {
                        "id": "1",
                        "title": "Software Engineer",
                        "company": "DemoCorp",
                        "matchScore": 85,
                        "missingSkills": ["Docker"]
                    }
                ],
                "visualSuggestions": [
                    "Use consistent formatting throughout"
                ]
            }
            return jsonify({"result": mock_result})

        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )

        messages = [
            {
                "role": "user",
                "content": (
                    "You are a supportive, encouraging professional resume coach. Analyze the following resume and provide a JSON response that is thorough, constructive, and actionable while focusing on the resume's strengths."
                    "\n\nInstructions:"
                    "\n- Start with a positive overall summary that emphasizes strengths first, then gentle constructive feedback."
                    "\n- Assign an overallScore (5-10, integer) - be generous with scoring to encourage improvement rather than discourage."
                    "\n- List strengths as specific, evidence-based bullet points. Find at least 3-4 strengths even in weaker resumes."
                    "\n- List areas for improvement as specific, actionable bullet points with a supportive tone."
                    "\n- For EACH major section (Work Experience, Skills, Education, Projects, Certifications, etc), output an object with:"
                    "    - sectionName (string)"
                    "    - score (5-10, integer, starting from 5 as the minimum)"
                    "    - summary (string, positive high-level assessment with constructive feedback)"
                    "    - strengths (array of string, with evidence from the resume)"
                    "    - weaknesses (array of string, phrased as 'opportunities for enhancement' rather than flaws)"
                    "    - suggestions (array of actionable improvement tips with a supportive tone)"
                    "    - examples (optional, array of example bullet points showing what a great section would include)"
                    "\n- Present all section analyses in a 'sections' array."
                    "\n- For key skills, output a 'keySkills' array of objects: {skill: string, score: 5-10, evidence: string}."
                    "\n- For jobMatches, ONLY use jobs from the provided jobs list. For each match, copy the job's id, title, company, and add a higher matchScore (30-100 range), missingSkills (limit to just 1-2 most important)."
                    "\n- Always fill out every field in the schema, even if empty."
                    "\n- Suggest visual/design improvements for readability in a positive way."
                    "\n- Use encouraging, positive language and bullet points."
                    "\n- Perform a Quantification Analysis. Scan the entire resume for bullet points containing numbers, percentages, or dollar amounts that demonstrate impact. Provide a 'quantificationAnalysis' object with a score, summary, and suggestions."
                    "\n- Output ONLY valid JSON in this schema:"
                    "{"
                    "  'overallSummary': string,"
                    "  'overallScore': integer (5-10),"
                    "  'strengths': array of string,"
                    "  'areasForImprovement': array of string,"
                    "  'sections': array of {sectionName: string, score: integer (5-10), summary: string, strengths: array of string, weaknesses: array of string, suggestions: array of string, examples?: array of string},"
                    "  'keySkills': array of {skill: string, score: integer (5-10), evidence: string},"
                    "  'jobMatches': array of {id: string, title: string, company: string, matchScore: integer (30-100), missingSkills: array of string},"
                    "  'visualSuggestions': array of string,"
                    "  'quantificationAnalysis': { 'quantificationScore': integer (0-10), 'summary': string, 'quantifiedExamples': array of string, 'improvementSuggestions': array of string }"
                    "}"
                    "\n\nExample jobMatches: [{ 'id': '123', 'title': 'Backend Engineer', 'company': 'TechCorp', 'matchScore': 85, 'missingSkills': ['Docker'] }]"
                    "\n\nHere is the resume:\n" + resume_text +
                    "\n\nHere is the list of available jobs (as JSON, each job has an 'id', 'title', 'company', 'tags'):\n" + str(jobs)
                )
            }
        ]

        completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout:free",
            messages=messages,
            max_tokens=2500,  # Limit tokens to prevent 402 errors
            temperature=0.7
        )
        result = completion.choices[0].message.content

        # DEBUG: Log the raw model result
        logging.info("=== RAW MODEL RESULT ===")
        logging.info(result)
        logging.info("========================")

        # Try to extract JSON from the result
        json_match = None
        try:
            json_match = result[result.index('{'):result.rindex('}')+1]
            ai_json = json.loads(json_match.replace("'", '"'))
        except Exception as e:
            logging.error("=== ERROR PARSING MODEL OUTPUT ===")
            import traceback
            logging.error(traceback.format_exc())
            logging.error("Model output was: %r", result)
            
            # Return a fallback response
            fallback_response = {
                "overallSummary": "We encountered an error analyzing your resume, but here's some general feedback.",
                "overallScore": 7,
                "strengths": ["Good resume structure"],
                "areasForImprovement": ["Add more quantifiable achievements"],
                "sections": [],
                "keySkills": [],
                "jobMatches": get_real_jobs()[:3],
                "visualSuggestions": ["Use consistent formatting"]
            }
            return jsonify({"result": fallback_response})

        # Post-process jobMatches: ensure full job objects
        raw_matches = ai_json.get('jobMatches', [])
        processed_matches = []
        if isinstance(raw_matches, list):
            for match in raw_matches:
                if isinstance(match, dict):
                    processed_matches.append({
                        'id': str(match.get('id', '')),
                        'title': match.get('title', '') or match.get('jobTitle', ''),
                        'company': match.get('company', '') or match.get('jobCompany', ''),
                        'matchScore': max(30, int(match.get('matchScore', 50))),  # Ensure minimum 30% match
                        'missingSkills': match.get('missingSkills', [])[:2]  # Limit to 2 missing skills max
                    })
                elif isinstance(match, str):
                    # fallback: find job in original list
                    job_obj = next((j for j in jobs if j.get('id') == match), None)
                    if job_obj:
                        processed_matches.append({
                            'id': job_obj.get('id', ''),
                            'title': job_obj.get('title', ''),
                            'company': job_obj.get('company', ''),
                            'matchScore': 50,  # Default to 50% match
                            'missingSkills': []
                        })
        ai_json['jobMatches'] = processed_matches

        # Compute local job matches based on resume keywords with higher baseline score
        resume_lower = resume_text.lower()
        local_matches = []
        for job in jobs:
            tags = job.get('tags', []) or []
            present = [tag for tag in tags if tag.lower() in resume_lower]
            missing = [tag for tag in tags if tag not in present][:2]  # Limit to 2 missing skills
            
            # Calculate score with a higher baseline (min 30%)
            base_score = 30
            skill_score = int((len(present) / max(1, len(tags))) * 70) if tags else 0
            total_score = base_score + skill_score
            
            local_matches.append({
                'id': job.get('id', ''),
                'title': job.get('title', ''),
                'company': job.get('company', ''),
                'matchScore': total_score,
                'missingSkills': missing
            })
        
        # select relevant matches
        # sort all by score
        local_matches.sort(key=lambda x: x['matchScore'], reverse=True)
        selected = local_matches[:5]  # Take top 5 matches
        
        ai_json['jobMatches'] = selected

        # Ensure minimum scores across all sections
        ai_json['overallScore'] = max(5, ai_json.get('overallScore', 7))
        
        for section in ai_json.get('sections', []):
            section['score'] = max(5, section.get('score', 6))
        
        for skill in ai_json.get('keySkills', []):
            skill['score'] = max(5, skill.get('score', 6))

        return jsonify({"result": ai_json})
    except Exception as e:
        logging.error(f"Error in analyze-resume endpoint: {str(e)}")
        import traceback
        logging.error(traceback.format_exc())
        
        # Return a fallback response
        fallback_response = {
            "overallSummary": "We encountered an error analyzing your resume, but here's some general feedback.",
            "overallScore": 7,
            "strengths": ["Good resume structure"],
            "areasForImprovement": ["Add more quantifiable achievements"],
            "sections": [],
            "keySkills": [],
            "jobMatches": [],
            "visualSuggestions": ["Use consistent formatting"]
        }
        return jsonify({"result": fallback_response})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

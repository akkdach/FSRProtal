import PyPDF2
import json

# Extract PDF content
with open('ASC Programs Excellent.pdf', 'rb') as pdf_file:
    reader = PyPDF2.PdfReader(pdf_file)
    
    content = {
        'total_pages': len(reader.pages),
        'pages': []
    }
    
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        content['pages'].append({
            'page_number': i + 1,
            'text': text
        })
    
    # Save as JSON
    with open('pdf_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(content, f, ensure_ascii=False, indent=2)
    
    print(f"Extracted {len(reader.pages)} pages successfully!")
    print("\nFirst page preview:")
    print(content['pages'][0]['text'][:500] if content['pages'] else "No content")

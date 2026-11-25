import json

with open(r'C:\Users\biswa\.gemini\antigravity\brain\e30aa116-172b-4555-a914-e6a0353d4d64\.system_generated\logs\transcript_full.jsonl', encoding='utf-8') as f:
    for line in f:
        if '"step_index":4575' in line:
            obj = json.loads(line)
            with open('user_req_4575.txt', 'w', encoding='utf-8') as out:
                out.write(obj.get('content', ''))
            print("Extracted successfully!")
            break

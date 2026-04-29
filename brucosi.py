import re
from collections import Counter

def analyze_whatsapp_chat(file_path):
    """
    Analizira WhatsApp chat i broji poruke po korisnicima
    """
    # Novi pattern: 7/3/23, 21:27 - Ime: Poruka
    pattern = r'^(\d{1,2}/\d{1,2}/\d{2,4}),\s\d{1,2}:\d{2}\s-\s([^:]+):'
    message_count = Counter()
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            lines = file.readlines()
        
        for line in lines:
            match = re.match(pattern, line)
            if match:
                sender = match.group(2).strip()
                message_count[sender] += 1
                
        return message_count
        
    except FileNotFoundError:
        print(f"Fajl {file_path} nije pronađen!")
        return None
    except Exception as e:
        print(f"Greška pri čitanju fajla: {e}")
        return None

def print_results(message_count):
    """
    Prikazuje rezultate sortirane po broju poruka (opadajuće) - samo top 20
    """
    if not message_count:
        print("Nema podataka za prikaz.")
        return

    print("\n=== ANALIZA WHATSAPP CHATA ===")
    print(f"Ukupno korisnika: {len(message_count)}")
    print(f"Ukupno poruka: {sum(message_count.values())}")
    print("\n--- Top 20 korisnika po broju poruka ---")
    
    sorted_users = message_count.most_common(20)
    
    for i, (user, count) in enumerate(sorted_users, 1):
        print(f"{i}. {user}: {count}")

def main():
    """
    Glavna funkcija
    """
    file_path = "whatsapp_chat.txt"
    
    print("WhatsApp Chat Analyzer")
    print("=" * 30)
    
    custom_path = input(f"Unesi putanju do fajla (ili Enter za '{file_path}'): ").strip()
    if custom_path:
        file_path = custom_path
    
    results = analyze_whatsapp_chat(file_path)
    
    if results:
        print_results(results)
    else:
        print("Analiza nije uspešna.")

if __name__ == "__main__":
    main()


"""
Realistic Enterprise Log Generator with Subtle Behavioral Anomalies
Generates logs where threat actors blend in with normal behavior
Threats are only detectable through statistical analysis and ML
"""

import random
import csv
from datetime import datetime, timedelta
from faker import Faker
import string

fake = Faker()
Faker.seed(42)
random.seed(42)

# =============================================================================
# CONFIGURATION
# =============================================================================

NUM_USERS = 50
NUM_DAYS = 30
START_DATE = datetime(2025, 1, 15, 0, 0, 0)
END_DATE = START_DATE + timedelta(days=NUM_DAYS)

# Employee roles and departments
DEPARTMENTS = ['Finance', 'HR', 'IT', 'Sales', 'Marketing', 'Operations', 'Engineering', 'Legal']
ROLES = ['Employee', 'Manager', 'Senior Manager', 'Director', 'Admin']

# Network and infrastructure
COMPANY_DOMAIN = "company.local"
INTERNAL_SUBNET = "192.168.1"

# Realistic external IPs (could be VPN, cloud services, or attacker)
EXTERNAL_IPS = ["185.22.19.55", "103.22.18.9", "45.23.1.99", "44.12.19.90", "23.19.55.1"]
VPN_IPS = ["203.45.67.89", "198.51.100.45"]  # Could be legitimate VPN or attacker

# File paths - organized by department access
DEPARTMENT_FOLDERS = {
    'Finance': ['/finance/reports', '/finance/budgets', '/finance/invoices'],
    'HR': ['/hr/policies', '/hr/onboarding', '/hr/benefits'],
    'IT': ['/it/infrastructure', '/it/tickets', '/it/documentation'],
    'Sales': ['/sales/leads', '/sales/contracts', '/sales/proposals'],
    'Marketing': ['/marketing/campaigns', '/marketing/content', '/marketing/analytics'],
    'Operations': ['/operations/procedures', '/operations/schedules'],
    'Engineering': ['/engineering/projects', '/engineering/documentation', '/engineering/builds'],
    'Legal': ['/legal/contracts', '/legal/compliance']
}

# Sensitive folders - need legitimate reason to access
SENSITIVE_FOLDERS = {
    'payroll': '/finance/payroll',
    'employee_records': '/hr/employee_records',
    'salary_info': '/hr/compensation',
    'source_code': '/engineering/source_code',
    'customer_pii': '/sales/customer_pii',
    'strategic_plans': '/executive/strategic',
    'financial_statements': '/finance/statements'
}

# Shared folders - anyone can access
SHARED_FOLDERS = [
    '/shared/documents', '/shared/templates', '/shared/resources',
    '/company/policies', '/company/announcements'
]

# =============================================================================
# PSYCHOMETRIC PROFILE GENERATION
# =============================================================================

def generate_ocean_scores():
    """Generate OCEAN (Big Five) personality scores"""
    return {
        'O': round(random.uniform(2.5, 5.0), 2),  # Openness
        'C': round(random.uniform(2.5, 5.0), 2),  # Conscientiousness
        'E': round(random.uniform(2.0, 5.0), 2),  # Extraversion
        'A': round(random.uniform(2.5, 5.0), 2),  # Agreeableness
        'N': round(random.uniform(1.5, 4.5), 2)   # Neuroticism
    }

def calculate_risk_profile(ocean):
    """Calculate behavioral risk factors based on OCEAN scores (internal use only)"""
    risk_score = 0
    
    if ocean['C'] < 3.0:
        risk_score += 2
    if ocean['N'] > 3.5:
        risk_score += 1.5
    if ocean['A'] < 3.0:
        risk_score += 1.5
    if ocean['O'] > 4.0:
        risk_score += 0.5
        
    return risk_score

# =============================================================================
# USER GENERATION
# =============================================================================

class User:
    def __init__(self, user_id, name, department, role, pc_id, ocean):
        self.user_id = user_id
        self.name = name
        self.username = name.lower().replace(' ', '.')
        self.department = department
        self.role = role
        self.pc_id = pc_id
        self.ocean = ocean
        self.risk_profile = calculate_risk_profile(ocean)
        self.email = f"{self.username}@{COMPANY_DOMAIN}"
        self.internal_ip = f"{INTERNAL_SUBNET}.{20 + int(user_id[1:])}"
        
        # Work patterns influenced by personality and role
        self.work_start_hour = random.randint(7, 10)
        self.work_end_hour = random.randint(16, 19)
        
        # Behavioral baselines (influenced by personality)
        self.avg_daily_files = max(3, int(ocean['O'] * 3) + random.randint(-2, 2))
        self.avg_daily_emails = max(2, int(ocean['E'] * 2) + random.randint(-1, 1))
        self.avg_daily_web = max(3, int(ocean['O'] * 4))
        
        # Legitimate access folders based on department
        self.allowed_folders = DEPARTMENT_FOLDERS.get(department, []) + SHARED_FOLDERS
        
        # Manager/Director have broader access
        if role in ['Manager', 'Senior Manager', 'Director']:
            self.allowed_folders.extend([f for dept_folders in DEPARTMENT_FOLDERS.values() 
                                        for f in dept_folders if dept_folders != DEPARTMENT_FOLDERS.get(department, [])])
        
        # INTERNAL ONLY: Threat actor designation (not in output!)
        # These simulate real-world subtle threat actors
        self._internal_threat_type = None  # 'insider', 'compromised', or None
        self._threat_start_date = None
        
    def set_threat_behavior(self, threat_type, start_date):
        """Internal method to designate threat actor behavior"""
        self._internal_threat_type = threat_type
        self._threat_start_date = start_date

def generate_users():
    """Generate user population with realistic behavioral patterns"""
    users = []
    
    for i in range(NUM_USERS):
        name = fake.name()
        department = random.choice(DEPARTMENTS)
        role = random.choices(
            ROLES,
            weights=[60, 20, 10, 7, 3],
            k=1
        )[0]
        pc_id = f"PC-{5000 + i}"
        ocean = generate_ocean_scores()
        
        user = User(f"U{i:04d}", name, department, role, pc_id, ocean)
        users.append(user)
    
    # INTERNAL: Select subtle threat actors
    # These users will have slightly anomalous patterns, not obvious
    
    # Insider threat: Someone with access who gradually exfiltrates data
    # Pick 1-2 users with higher risk profiles
    insider_candidates = [u for u in users if u.risk_profile > 3.5 and u.role in ['Employee', 'Manager']]
    if insider_candidates:
        insider = random.choice(insider_candidates)
        # Start threat behavior midway through period
        insider.set_threat_behavior('insider', START_DATE + timedelta(days=random.randint(5, 10)))
    
    # Compromised account: Normal user whose credentials were stolen
    # Pick 1 user (could be anyone)
    compromised_candidates = [u for u in users if u.role in ['Employee', 'Manager'] and 
                             (not hasattr(u, '_internal_threat_type') or u._internal_threat_type is None)]
    if compromised_candidates:
        compromised = random.choice(compromised_candidates)
        # Compromise happens midway
        compromised.set_threat_behavior('compromised', START_DATE + timedelta(days=random.randint(12, 18)))
    
    return users

# =============================================================================
# LOG GENERATORS
# =============================================================================

def generate_random_id():
    """Generate random ID similar to dataset format"""
    chars = string.ascii_uppercase + string.digits
    return '{' + ''.join(random.choices(chars, k=8)) + '-' + \
           ''.join(random.choices(chars, k=8)) + '-' + \
           ''.join(random.choices(chars, k=4)) + '}'

def is_working_hours(timestamp, user):
    """Check if timestamp is within user's working hours"""
    hour = timestamp.hour
    weekday = timestamp.weekday()
    
    # Weekend
    if weekday >= 5:
        return random.random() < 0.1  # 10% chance of weekend work
    
    # During work hours
    if user.work_start_hour <= hour <= user.work_end_hour:
        return True
    
    # Outside work hours (low probability)
    return random.random() < 0.05

def generate_logon_logoff_logs(users, output_file):
    """Generate realistic authentication logs"""
    logs = []
    
    for user in users:
        current_date = START_DATE
        
        while current_date < END_DATE:
            # Normal working day pattern
            if current_date.weekday() < 5:  # Weekday
                # Morning logon - slight variation in time
                logon_time = current_date.replace(
                    hour=user.work_start_hour,
                    minute=random.randint(0, 59),
                    second=random.randint(0, 59)
                )
                
                # Normal login
                logs.append({
                    'id': generate_random_id(),
                    'date': logon_time.strftime('%m/%d/%Y %H:%M:%S'),
                    'user': user.user_id,
                    'pc': user.pc_id,
                    'activity': 'Logon',
                    'source_ip': user.internal_ip,
                    'status': 'Success'
                })
                
                # Compromised account: SUBTLE indicators
                if (hasattr(user, '_internal_threat_type') and 
                    user._internal_threat_type == 'compromised' and 
                    current_date >= user._threat_start_date):
                    
                    # 20% chance of unusual login time (but could be legitimate late work)
                    if random.random() < 0.2:
                        unusual_time = current_date.replace(
                            hour=random.choice([22, 23, 1, 2]),  # Late night
                            minute=random.randint(0, 59),
                            second=random.randint(0, 59)
                        )
                        # Sometimes from different IP (could be VPN or home)
                        source = random.choice([user.internal_ip, random.choice(VPN_IPS)])
                        
                        logs.append({
                            'id': generate_random_id(),
                            'date': unusual_time.strftime('%m/%d/%Y %H:%M:%S'),
                            'user': user.user_id,
                            'pc': user.pc_id,
                            'activity': 'Logon',
                            'source_ip': source,
                            'status': 'Success'
                        })
                    
                    # Very rare: 5% chance of failed login (attacker testing)
                    if random.random() < 0.05:
                        failed_time = logon_time - timedelta(minutes=random.randint(1, 10))
                        logs.append({
                            'id': generate_random_id(),
                            'date': failed_time.strftime('%m/%d/%Y %H:%M:%S'),
                            'user': user.user_id,
                            'pc': user.pc_id,
                            'activity': 'Logon',
                            'source_ip': random.choice(VPN_IPS),
                            'status': 'Failed'
                        })
                
                # Evening logoff
                logoff_time = current_date.replace(
                    hour=user.work_end_hour,
                    minute=random.randint(0, 59),
                    second=random.randint(0, 59)
                )
                
                logs.append({
                    'id': generate_random_id(),
                    'date': logoff_time.strftime('%m/%d/%Y %H:%M:%S'),
                    'user': user.user_id,
                    'pc': user.pc_id,
                    'activity': 'Logoff',
                    'source_ip': user.internal_ip,
                    'status': 'Success'
                })
            
            # Weekend work (occasional)
            elif random.random() < 0.1:  # 10% chance
                weekend_time = current_date.replace(
                    hour=random.randint(10, 16),
                    minute=random.randint(0, 59)
                )
                logs.append({
                    'id': generate_random_id(),
                    'date': weekend_time.strftime('%m/%d/%Y %H:%M:%S'),
                    'user': user.user_id,
                    'pc': user.pc_id,
                    'activity': 'Logon',
                    'source_ip': user.internal_ip,
                    'status': 'Success'
                })
            
            current_date += timedelta(days=1)
    
    # Write to CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['id', 'date', 'user', 'pc', 'activity', 'source_ip', 'status']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(logs)
    
    print(f"✓ Generated {len(logs)} logon/logoff events → {output_file}")

def generate_device_logs(users, output_file):
    """Generate realistic USB device connection logs"""
    logs = []
    
    for user in users:
        current_date = START_DATE
        
        # Normal users: 0-2 USB uses over 30 days
        num_normal_uses = random.randint(0, 2)
        
        # Insider threat: 3-5 USB uses (subtle increase, not 10x)
        if (hasattr(user, '_internal_threat_type') and 
            user._internal_threat_type == 'insider' and 
            current_date >= user._threat_start_date):
            num_uses = random.randint(3, 5)
        else:
            num_uses = num_normal_uses
        
        # Generate USB events on random days
        use_days = random.sample(range(NUM_DAYS), min(num_uses, NUM_DAYS))
        
        for day_offset in use_days:
            event_date = START_DATE + timedelta(days=day_offset)
            
            if event_date < current_date:
                continue
                
            event_time = event_date.replace(
                hour=random.randint(user.work_start_hour, user.work_end_hour),
                minute=random.randint(0, 59),
                second=random.randint(0, 59)
            )
            
            # Connect
            logs.append({
                'id': generate_random_id(),
                'date': event_time.strftime('%m/%d/%Y %H:%M:%S'),
                'user': user.user_id,
                'pc': user.pc_id,
                'file_tree': f"R:\\;R:\\{user.user_id}",
                'activity': 'Connect'
            })
            
            # Disconnect after 5-20 minutes
            disconnect_time = event_time + timedelta(minutes=random.randint(5, 20))
            logs.append({
                'id': generate_random_id(),
                'date': disconnect_time.strftime('%m/%d/%Y %H:%M:%S'),
                'user': user.user_id,
                'pc': user.pc_id,
                'file_tree': '',
                'activity': 'Disconnect'
            })
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['id', 'date', 'user', 'pc', 'file_tree', 'activity']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(logs)
    
    print(f"✓ Generated {len(logs)} device connection events → {output_file}")

def generate_file_activity_logs(users, output_file):
    """Generate realistic file access logs with subtle anomalies"""
    logs = []
    
    file_extensions = ['.doc', '.docx', '.xlsx', '.pdf', '.txt', '.pptx', '.csv']
    activities = ['File Open', 'File Write', 'File Copy']
    
    for user in users:
        current_date = START_DATE
        
        while current_date < END_DATE:
            if current_date.weekday() < 5:  # Weekday
                # Daily file accesses based on personality
                num_accesses = random.randint(user.avg_daily_files, user.avg_daily_files + 3)
                
                for _ in range(num_accesses):
                    event_time = current_date.replace(
                        hour=random.randint(user.work_start_hour, user.work_end_hour),
                        minute=random.randint(0, 59),
                        second=random.randint(0, 59)
                    )
                    
                    # Determine file access pattern
                    is_insider = (hasattr(user, '_internal_threat_type') and 
                                 user._internal_threat_type == 'insider' and
                                 current_date >= user._threat_start_date)
                    
                    is_compromised = (hasattr(user, '_internal_threat_type') and 
                                     user._internal_threat_type == 'compromised' and
                                     current_date >= user._threat_start_date)
                    
                    # NORMAL BEHAVIOR: 80-90% of accesses
                    if random.random() < 0.85:
                        # Access allowed folders
                        folder = random.choice(user.allowed_folders)
                        filename = f"{folder}/{fake.word()}{random.choice(file_extensions)}"
                        to_removable = False
                        size = random.randint(1000, 200000)
                    
                    # INSIDER: 15% chance of sensitive file access (subtle!)
                    elif is_insider and random.random() < 0.15:
                        # Access sensitive folder occasionally
                        sensitive_folder = random.choice(list(SENSITIVE_FOLDERS.values()))
                        filename = f"{sensitive_folder}/{fake.word()}{random.choice(file_extensions)}"
                        # Sometimes copy to removable media (but not always)
                        to_removable = random.random() < 0.3
                        # Smaller files (realistic - not downloading GBs)
                        size = random.randint(50000, 800000)
                    
                    # COMPROMISED: 10% chance of unusual file access
                    elif is_compromised and random.random() < 0.10:
                        # Access files outside their department
                        other_depts = [d for d in DEPARTMENTS if d != user.department]
                        other_dept = random.choice(other_depts)
                        folder = random.choice(DEPARTMENT_FOLDERS.get(other_dept, SHARED_FOLDERS))
                        filename = f"{folder}/{fake.word()}{random.choice(file_extensions)}"
                        to_removable = False
                        size = random.randint(10000, 300000)
                    
                    # LEGITIMATE SENSITIVE ACCESS (Managers/Directors)
                    elif user.role in ['Manager', 'Senior Manager', 'Director'] and random.random() < 0.15:
                        sensitive_folder = random.choice(list(SENSITIVE_FOLDERS.values()))
                        filename = f"{sensitive_folder}/{fake.word()}{random.choice(file_extensions)}"
                        to_removable = False
                        size = random.randint(20000, 400000)
                    
                    else:
                        # Normal shared folder access
                        folder = random.choice(SHARED_FOLDERS)
                        filename = f"{folder}/{fake.word()}{random.choice(file_extensions)}"
                        to_removable = False
                        size = random.randint(5000, 150000)
                    
                    activity = random.choice(activities)
                    content = fake.sentence(nb_words=12)
                    
                    logs.append({
                        'id': generate_random_id(),
                        'date': event_time.strftime('%m/%d/%Y %H:%M:%S'),
                        'user': user.user_id,
                        'pc': user.pc_id,
                        'filename': filename,
                        'activity': activity,
                        'to_removable_media': str(to_removable),
                        'from_removable_media': 'False',
                        'content': content,
                        'size': size
                    })
            
            current_date += timedelta(days=1)
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['id', 'date', 'user', 'pc', 'filename', 'activity', 
                     'to_removable_media', 'from_removable_media', 'content', 'size']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(logs)
    
    print(f"✓ Generated {len(logs)} file activity events → {output_file}")

def generate_http_logs(users, output_file):
    """Generate realistic web browsing logs"""
    logs = []
    
    # Normal business websites
    legitimate_sites = [
        "https://docs.google.com", "https://github.com", "https://stackoverflow.com",
        "https://microsoft.com", "https://office.com", "https://salesforce.com",
        "https://linkedin.com", "https://zoom.us", "https://slack.com",
        "https://dropbox.com", "https://aws.amazon.com", "https://azure.microsoft.com"
    ]
    
    # Suspicious but not obvious (could be ads, trackers, or C2)
    ambiguous_sites = [
        "http://analytics-tracker.xyz", "http://cdn-content-delivery.net",
        "http://ad-serve-system.com", "http://metrics-collector.io"
    ]
    
    for user in users:
        current_date = START_DATE
        
        while current_date < END_DATE:
            if current_date.weekday() < 5:  # Weekday
                # Daily web browsing
                num_visits = random.randint(user.avg_daily_web, user.avg_daily_web + 5)
                
                for _ in range(num_visits):
                    event_time = current_date.replace(
                        hour=random.randint(user.work_start_hour, user.work_end_hour),
                        minute=random.randint(0, 59),
                        second=random.randint(0, 59)
                    )
                    
                    is_compromised = (hasattr(user, '_internal_threat_type') and 
                                     user._internal_threat_type == 'compromised' and
                                     current_date >= user._threat_start_date)
                    
                    # 95% normal browsing
                    if random.random() < 0.95:
                        url = random.choice(legitimate_sites) + "/" + fake.uri_path()
                        content = fake.sentence(nb_words=20)
                    # 5% ambiguous sites (for compromised users after compromise)
                    elif is_compromised and random.random() < 0.05:
                        url = random.choice(ambiguous_sites)
                        content = fake.sentence(nb_words=15)
                    else:
                        url = random.choice(legitimate_sites) + "/" + fake.uri_path()
                        content = fake.sentence(nb_words=18)
                    
                    logs.append({
                        'id': generate_random_id(),
                        'date': event_time.strftime('%m/%d/%Y %H:%M:%S'),
                        'user': user.user_id,
                        'pc': user.pc_id,
                        'url': url,
                        'activity': 'WWW Visit',
                        'content': content
                    })
            
            current_date += timedelta(days=1)
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['id', 'date', 'user', 'pc', 'url', 'activity', 'content']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(logs)
    
    print(f"✓ Generated {len(logs)} HTTP browsing events → {output_file}")

def generate_email_logs(users, output_file):
    """Generate realistic email activity logs"""
    logs = []
    
    # Personal email domains for potential data exfiltration
    personal_domains = ['@gmail.com', '@yahoo.com', '@outlook.com', '@hotmail.com']
    
    for user in users:
        current_date = START_DATE
        
        while current_date < END_DATE:
            if current_date.weekday() < 5:  # Weekday
                # Daily emails based on personality
                num_emails = random.randint(user.avg_daily_emails, user.avg_daily_emails + 2)
                
                for _ in range(num_emails):
                    event_time = current_date.replace(
                        hour=random.randint(user.work_start_hour, user.work_end_hour),
                        minute=random.randint(0, 59),
                        second=random.randint(0, 59)
                    )
                    
                    is_insider = (hasattr(user, '_internal_threat_type') and 
                                 user._internal_threat_type == 'insider' and
                                 current_date >= user._threat_start_date)
                    
                    # Normal emails (95%)
                    if random.random() < 0.95:
                        # Email to colleagues
                        recipient = random.choice([u for u in users if u.user_id != user.user_id])
                        to_email = recipient.email
                        
                        # Occasional CC
                        cc = ''
                        if random.random() < 0.15:
                            cc_user = random.choice([u for u in users if u.user_id not in [user.user_id, recipient.user_id]])
                            cc = cc_user.email
                        
                        subject = fake.sentence(nb_words=5)
                        content = fake.text(max_nb_chars=120)
                        attachments = '' if random.random() < 0.7 else f"{fake.word()}.{random.choice(['pdf', 'docx', 'xlsx'])}"
                        size = random.randint(5000, 150000)
                    
                    # Insider: Very occasional email to personal account (subtle!)
                    elif is_insider and random.random() < 0.05:
                        # Send to personal email
                        personal_email = user.username.split('.')[0] + random.choice(personal_domains)
                        to_email = personal_email
                        cc = ''
                        
                        subject = fake.sentence(nb_words=4)
                        content = fake.text(max_nb_chars=100)
                        # Sometimes has attachment (data exfiltration)
                        attachments = f"{fake.word()}.{random.choice(['pdf', 'xlsx', 'zip'])}" if random.random() < 0.4 else ''
                        size = random.randint(50000, 500000) if attachments else random.randint(5000, 20000)
                    
                    else:
                        # Normal internal email
                        recipient = random.choice([u for u in users if u.user_id != user.user_id])
                        to_email = recipient.email
                        cc = ''
                        subject = fake.sentence(nb_words=5)
                        content = fake.text(max_nb_chars=130)
                        attachments = ''
                        size = random.randint(5000, 80000)
                    
                    logs.append({
                        'id': generate_random_id(),
                        'date': event_time.strftime('%m/%d/%Y %H:%M:%S'),
                        'user': user.user_id,
                        'pc': user.pc_id,
                        'to': to_email,
                        'cc': cc,
                        'bcc': '',
                        'from': user.email,
                        'activity': 'Send',
                        'size': size,
                        'attachments': attachments,
                        'content': content,
                        'subject': subject
                    })
            
            current_date += timedelta(days=1)
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['id', 'date', 'user', 'pc', 'to', 'cc', 'bcc', 'from', 
                     'activity', 'size', 'attachments', 'content', 'subject']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(logs)
    
    print(f"✓ Generated {len(logs)} email events → {output_file}")

def generate_endpoint_logs(users, output_file):
    """Generate realistic endpoint security logs"""
    logs = []
    
    normal_processes = [
        'chrome.exe', 'firefox.exe', 'outlook.exe', 'excel.exe', 'word.exe',
        'teams.exe', 'slack.exe', 'notepad.exe', 'explorer.exe', 'acrobat.exe'
    ]
    
    # PowerShell/cmd are used legitimately by IT staff
    admin_processes = ['powershell.exe', 'cmd.exe']
    
    for user in users:
        current_date = START_DATE
        
        while current_date < END_DATE:
            if current_date.weekday() < 5:
                # Daily process events
                num_events = random.randint(8, 15)
                
                for _ in range(num_events):
                    event_time = current_date.replace(
                        hour=random.randint(user.work_start_hour, user.work_end_hour),
                        minute=random.randint(0, 59),
                        second=random.randint(0, 59)
                    )
                    
                    is_compromised = (hasattr(user, '_internal_threat_type') and 
                                     user._internal_threat_type == 'compromised' and
                                     current_date >= user._threat_start_date)
                    
                    # Normal process execution (90%)
                    if random.random() < 0.90:
                        process = random.choice(normal_processes)
                        parent = 'explorer.exe'
                        command_line = process
                        integrity = 'medium'
                    
                    # IT staff legitimately use PowerShell
                    elif user.department == 'IT' and user.role in ['Admin', 'Manager']:
                        process = random.choice(admin_processes)
                        parent = 'explorer.exe'
                        # Legitimate admin commands
                        command_line = random.choice([
                            'powershell.exe Get-Process',
                            'cmd.exe /c ipconfig',
                            'powershell.exe Get-EventLog'
                        ])
                        integrity = 'high' if random.random() < 0.3 else 'medium'
                    
                    # Compromised: Very rare suspicious command (5%)
                    elif is_compromised and random.random() < 0.05:
                        process = random.choice(admin_processes)
                        parent = 'explorer.exe'
                        # Ambiguous command (could be legitimate or malicious)
                        command_line = random.choice([
                            'powershell.exe Get-ChildItem',
                            'cmd.exe /c dir',
                            'powershell.exe Test-Connection'
                        ])
                        integrity = 'medium'
                    
                    else:
                        process = random.choice(normal_processes)
                        parent = 'explorer.exe'
                        command_line = process
                        integrity = 'medium'
                    
                    logs.append({
                        'id': generate_random_id(),
                        'timestamp': event_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                        'user': user.username,
                        'pc': user.pc_id,
                        'event': 'process_start',
                        'process': process,
                        'parent_process': parent,
                        'command_line': command_line,
                        'integrity_level': integrity
                    })
            
            current_date += timedelta(days=1)
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['id', 'timestamp', 'user', 'pc', 'event', 'process', 
                     'parent_process', 'command_line', 'integrity_level']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(logs)
    
    print(f"✓ Generated {len(logs)} endpoint security events → {output_file}")

def generate_network_flow_logs(users, output_file):
    """Generate realistic network flow logs"""
    logs = []
    
    # Common external services
    common_destinations = [
        '8.8.8.8', '8.8.4.4',  # Google DNS
        '1.1.1.1', '1.0.0.1',  # Cloudflare DNS
        '172.217.0.0', '142.250.0.0'  # Google services
    ]
    
    for user in users:
        current_date = START_DATE
        
        while current_date < END_DATE:
            if current_date.weekday() < 5:
                # Daily network flows
                num_flows = random.randint(15, 30)
                
                for _ in range(num_flows):
                    event_time = current_date.replace(
                        hour=random.randint(user.work_start_hour, user.work_end_hour),
                        minute=random.randint(0, 59),
                        second=random.randint(0, 59)
                    )
                    
                    is_compromised = (hasattr(user, '_internal_threat_type') and 
                                     user._internal_threat_type == 'compromised' and
                                     current_date >= user._threat_start_date)
                    
                    is_insider = (hasattr(user, '_internal_threat_type') and 
                                 user._internal_threat_type == 'insider' and
                                 current_date >= user._threat_start_date)
                    
                    src_ip = user.internal_ip
                    
                    # Normal internet traffic (85%)
                    if random.random() < 0.85:
                        dst_ip = random.choice(common_destinations)
                        protocol = 'HTTPS'
                        dst_port = 443
                        bytes_out = random.randint(2000, 50000)
                        bytes_in = random.randint(5000, 100000)
                        alert = ''
                    
                    # Insider: Slightly larger uploads occasionally (10%)
                    elif is_insider and random.random() < 0.10:
                        dst_ip = random.choice(common_destinations)
                        protocol = 'HTTPS'
                        dst_port = 443
                        # Larger but realistic (200-600KB, not 9MB!)
                        bytes_out = random.randint(200000, 600000)
                        bytes_in = random.randint(10000, 50000)
                        alert = ''
                    
                    # Compromised: Very rare lateral movement (3%)
                    elif is_compromised and random.random() < 0.03:
                        # RDP to another internal machine
                        other_user = random.choice([u for u in users if u.user_id != user.user_id])
                        dst_ip = other_user.internal_ip
                        protocol = 'RDP'
                        dst_port = 3389
                        bytes_out = random.randint(10000, 80000)
                        bytes_in = random.randint(10000, 80000)
                        alert = ''  # Not flagged automatically
                    
                    # Compromised: Occasional larger upload (5%)
                    elif is_compromised and random.random() < 0.05:
                        dst_ip = random.choice(VPN_IPS)  # Could be VPN or attacker
                        protocol = 'HTTPS'
                        dst_port = 443
                        # Moderately larger uploads (300-800KB)
                        bytes_out = random.randint(300000, 800000)
                        bytes_in = random.randint(5000, 30000)
                        alert = ''
                    
                    else:
                        dst_ip = random.choice(common_destinations)
                        protocol = 'HTTPS'
                        dst_port = 443
                        bytes_out = random.randint(3000, 60000)
                        bytes_in = random.randint(8000, 120000)
                        alert = ''
                    
                    logs.append({
                        'id': generate_random_id(),
                        'timestamp': event_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                        'src_ip': src_ip,
                        'dst_ip': dst_ip,
                        'dst_port': dst_port,
                        'protocol': protocol,
                        'bytes_in': bytes_in,
                        'bytes_out': bytes_out,
                        'alert': alert,
                        'user': user.username
                    })
            
            current_date += timedelta(days=1)
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['id', 'timestamp', 'src_ip', 'dst_ip', 'dst_port', 
                     'protocol', 'bytes_in', 'bytes_out', 'alert', 'user']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(logs)
    
    print(f"✓ Generated {len(logs)} network flow events → {output_file}")

def generate_firewall_logs(users, output_file):
    """Generate realistic firewall logs"""
    logs = []
    
    for user in users:
        current_date = START_DATE
        
        while current_date < END_DATE:
            if current_date.weekday() < 5:
                num_events = random.randint(20, 40)
                
                for _ in range(num_events):
                    event_time = current_date.replace(
                        hour=random.randint(user.work_start_hour, user.work_end_hour),
                        minute=random.randint(0, 59),
                        second=random.randint(0, 59)
                    )
                    
                    src_ip = user.internal_ip
                    
                    # Most traffic is allowed (92%)
                    if random.random() < 0.92:
                        action = 'allow'
                        dst_ip = random.choice(['8.8.8.8', '1.1.1.1', '172.217.0.0'])
                        dst_port = random.choice([443, 80, 53])
                        protocol = 'TCP'
                        bytes_out = random.randint(1000, 60000)
                        threat = ''
                    
                    # Some traffic is legitimately blocked (8%)
                    else:
                        action = 'block'
                        dst_ip = f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
                        dst_port = random.choice([445, 22, 3389, 23, 135])
                        protocol = 'TCP'
                        bytes_out = random.randint(200, 5000)
                        threat = random.choice(['port_scan', 'geo_blocked', 'policy_violation', ''])
                    
                    logs.append({
                        'id': generate_random_id(),
                        'timestamp': event_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                        'action': action,
                        'src_ip': src_ip,
                        'dst_ip': dst_ip,
                        'dst_port': dst_port,
                        'protocol': protocol,
                        'bytes_out': bytes_out,
                        'threat': threat,
                        'user': user.username
                    })
            
            current_date += timedelta(days=1)
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['id', 'timestamp', 'action', 'src_ip', 'dst_ip', 
                     'dst_port', 'protocol', 'bytes_out', 'threat', 'user']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(logs)
    
    print(f"✓ Generated {len(logs)} firewall events → {output_file}")

def save_psychometric_data(users, output_file):
    """Save psychometric profiles WITHOUT threat actor labels"""
    data = []
    for user in users:
        data.append({
            'employee_name': user.name,
            'user_id': user.user_id,
            'username': user.username,
            'department': user.department,
            'role': user.role,
            'O': user.ocean['O'],
            'C': user.ocean['C'],
            'E': user.ocean['E'],
            'A': user.ocean['A'],
            'N': user.ocean['N']
        })
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['employee_name', 'user_id', 'username', 'department', 'role',
                     'O', 'C', 'E', 'A', 'N']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    
    print(f"✓ Generated psychometric profiles → {output_file}")

# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    print("=" * 70)
    print("REALISTIC ENTERPRISE LOG GENERATOR")
    print("Subtle Behavioral Anomalies for UEBA Detection")
    print("=" * 70)
    print(f"\n📊 Configuration:")
    print(f"   • Users: {NUM_USERS}")
    print(f"   • Duration: {NUM_DAYS} days")
    print(f"   • Date Range: {START_DATE.date()} to {END_DATE.date()}")
    print(f"\n🔄 Generating realistic enterprise logs...\n")
    
    # Generate users with psychometric profiles
    users = generate_users()
    
    # Save psychometric data (no threat labels exposed)
    save_psychometric_data(users, 'psychometric.csv')
    
    # Generate all log types
    generate_logon_logoff_logs(users, 'logon.csv')
    generate_device_logs(users, 'device.csv')
    generate_file_activity_logs(users, 'file.csv')
    generate_http_logs(users, 'http.csv')
    generate_email_logs(users, 'email.csv')
    generate_endpoint_logs(users, 'endpoint.csv')
    generate_network_flow_logs(users, 'network_flow.csv')
    generate_firewall_logs(users, 'firewall.csv')
    
    print(f"\n{'=' * 70}")
    print(" LOG GENERATION COMPLETE!")
    print(f"{'=' * 70}")
    
    print(f"\n📁 Output Files:")
    print(f"   • psychometric.csv - User profiles with OCEAN scores")
    print(f"   • logon.csv - Authentication logs")
    print(f"   • device.csv - USB device activity")
    print(f"   • file.csv - File access logs")
    print(f"   • http.csv - Web browsing logs")
    print(f"   • email.csv - Email activity")
    print(f"   • endpoint.csv - Endpoint security events")
    print(f"   • network_flow.csv - Network traffic flows")
    print(f"   • firewall.csv - Firewall events")
    
    print(f"\n⚠️  Note: Logs contain subtle behavioral anomalies that require")
    print(f"    statistical analysis and ML models to detect. Threat actors")
    print(f"    blend in with normal behavior patterns.")
    
    print(f"\n{'=' * 70}\n")

if __name__ == "__main__":
    main()
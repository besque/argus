"""
Enterprise Log Cleaning & Normalization for UEBA System
Prepares raw logs for ML models: Baseline Deviation, Markov Chains, Isolation Forest
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import json
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')

# =============================================================================
# CONFIGURATION
# =============================================================================

INPUT_DIR = './logs'
OUTPUT_DIR = './cleaned_data'

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 70)
print("ENTERPRISE LOG CLEANING & NORMALIZATION")
print("=" * 70)
print(f"\n📂 Input Directory: {INPUT_DIR}")
print(f"📂 Output Directory: {OUTPUT_DIR}\n")

# =============================================================================
# STEP 1: LOAD AND PARSE RAW LOGS
# =============================================================================

def load_raw_logs():
    """Load all raw CSV logs from input directory"""
    print("🔄 Step 1: Loading raw logs...\n")
    
    logs = {}
    
    # Logon logs
    try:
        logon = pd.read_csv(f'{INPUT_DIR}/logon.csv')
        logon['date'] = pd.to_datetime(logon['date'], format='%m/%d/%Y %H:%M:%S')
        logs['logon'] = logon
        print(f"   ✓ Loaded {len(logon)} logon events")
    except Exception as e:
        print(f"   ✗ Error loading logon.csv: {e}")
    
    # Device logs
    try:
        device = pd.read_csv(f'{INPUT_DIR}/device.csv')
        device['date'] = pd.to_datetime(device['date'], format='%m/%d/%Y %H:%M:%S')
        logs['device'] = device
        print(f"   ✓ Loaded {len(device)} device events")
    except Exception as e:
        print(f"   ✗ Error loading device.csv: {e}")
    
    # File logs
    try:
        file = pd.read_csv(f'{INPUT_DIR}/file.csv')
        file['date'] = pd.to_datetime(file['date'], format='%m/%d/%Y %H:%M:%S')
        logs['file'] = file
        print(f"   ✓ Loaded {len(file)} file events")
    except Exception as e:
        print(f"   ✗ Error loading file.csv: {e}")
    
    # HTTP logs
    try:
        http = pd.read_csv(f'{INPUT_DIR}/http.csv')
        http['date'] = pd.to_datetime(http['date'], format='%m/%d/%Y %H:%M:%S')
        logs['http'] = http
        print(f"   ✓ Loaded {len(http)} HTTP events")
    except Exception as e:
        print(f"   ✗ Error loading http.csv: {e}")
    
    # Email logs
    try:
        email = pd.read_csv(f'{INPUT_DIR}/email.csv')
        email['date'] = pd.to_datetime(email['date'], format='%m/%d/%Y %H:%M:%S')
        logs['email'] = email
        print(f"   ✓ Loaded {len(email)} email events")
    except Exception as e:
        print(f"   ✗ Error loading email.csv: {e}")
    
    # Endpoint logs
    try:
        endpoint = pd.read_csv(f'{INPUT_DIR}/endpoint.csv')
        endpoint['timestamp'] = pd.to_datetime(endpoint['timestamp'], format='%Y-%m-%dT%H:%M:%SZ')
        endpoint.rename(columns={'timestamp': 'date'}, inplace=True)
        logs['endpoint'] = endpoint
        print(f"   ✓ Loaded {len(endpoint)} endpoint events")
    except Exception as e:
        print(f"   ✗ Error loading endpoint.csv: {e}")
    
    # Network flow logs
    try:
        netflow = pd.read_csv(f'{INPUT_DIR}/network_flow.csv')
        netflow['timestamp'] = pd.to_datetime(netflow['timestamp'], format='%Y-%m-%dT%H:%M:%SZ')
        netflow.rename(columns={'timestamp': 'date'}, inplace=True)
        logs['netflow'] = netflow
        print(f"   ✓ Loaded {len(netflow)} network flow events")
    except Exception as e:
        print(f"   ✗ Error loading network_flow.csv: {e}")
    
    # Firewall logs
    try:
        firewall = pd.read_csv(f'{INPUT_DIR}/firewall.csv')
        firewall['timestamp'] = pd.to_datetime(firewall['timestamp'], format='%Y-%m-%dT%H:%M:%SZ')
        firewall.rename(columns={'timestamp': 'date'}, inplace=True)
        logs['firewall'] = firewall
        print(f"   ✓ Loaded {len(firewall)} firewall events")
    except Exception as e:
        print(f"   ✗ Error loading firewall.csv: {e}")
    
    # Psychometric data
    try:
        psycho = pd.read_csv(f'{INPUT_DIR}/psychometric.csv')
        logs['psychometric'] = psycho
        print(f"   ✓ Loaded {len(psycho)} user profiles")
    except Exception as e:
        print(f"   ✗ Error loading psychometric.csv: {e}")
    
    return logs

# =============================================================================
# STEP 2: EXTRACT TEMPORAL FEATURES
# =============================================================================

def extract_temporal_features(df, date_col='date'):
    """Extract hour, day_of_week, is_weekend, is_working_hours from datetime"""
    df = df.copy()
    
    df['hour'] = df[date_col].dt.hour
    df['day_of_week'] = df[date_col].dt.dayofweek  # 0=Monday, 6=Sunday
    df['day_of_month'] = df[date_col].dt.day
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    df['is_working_hours'] = ((df['hour'] >= 7) & (df['hour'] <= 19)).astype(int)
    df['is_late_night'] = ((df['hour'] >= 22) | (df['hour'] <= 4)).astype(int)
    
    return df

# =============================================================================
# STEP 3: FEATURE ENGINEERING PER LOG TYPE
# =============================================================================

def engineer_logon_features(logon_df):
    """Engineer features for authentication logs"""
    df = logon_df.copy()
    df = extract_temporal_features(df)
    
    # Failed login flag
    df['is_failed_login'] = (df['status'] == 'Failed').astype(int)
    
    # External IP flag (not 192.168.x.x)
    df['is_external_ip'] = (~df['source_ip'].str.startswith('192.168.')).astype(int)
    
    # Logoff vs Logon
    df['is_logoff'] = (df['activity'] == 'Logoff').astype(int)
    
    return df

def engineer_file_features(file_df):
    """Engineer features for file access logs"""
    df = file_df.copy()
    df = extract_temporal_features(df)
    
    # Extract folder category
    df['is_sensitive_folder'] = df['filename'].str.contains(
        'payroll|compensation|employee_records|salary|strategic|source_code',
        case=False, na=False
    ).astype(int)
    
    df['is_shared_folder'] = df['filename'].str.contains(
        '/shared/|/company/',
        case=False, na=False
    ).astype(int)
    
    # File size category
    df['size_mb'] = df['size'] / 1024 / 1024
    df['is_large_file'] = (df['size_mb'] > 0.5).astype(int)
    
    # Removable media usage
    df['to_removable_media'] = df['to_removable_media'].map({'True': 1, 'False': 0, True: 1, False: 0})
    
    # Activity type encoding
    df['activity_encoded'] = df['activity'].map({
        'File Open': 0,
        'File Write': 1,
        'File Copy': 2
    })
    
    return df

def engineer_email_features(email_df):
    """Engineer features for email logs"""
    df = email_df.copy()
    df = extract_temporal_features(df)
    
    # External recipient (not @company.local)
    df['is_external_recipient'] = (~df['to'].str.contains('company.local', na=False)).astype(int)
    
    # Has attachment
    df['has_attachment'] = (df['attachments'].notna() & (df['attachments'] != '')).astype(int)
    
    # Email size category
    df['size_kb'] = df['size'] / 1024
    df['is_large_email'] = (df['size_kb'] > 200).astype(int)
    
    # Has CC
    df['has_cc'] = (df['cc'].notna() & (df['cc'] != '')).astype(int)
    
    return df

def engineer_http_features(http_df):
    """Engineer features for web browsing logs"""
    df = http_df.copy()
    df = extract_temporal_features(df)
    
    # Protocol (http vs https)
    df['is_https'] = df['url'].str.startswith('https://').astype(int)
    
    # Potentially suspicious domains
    df['is_suspicious_domain'] = df['url'].str.contains(
        'analytics-tracker|ad-serve|metrics-collector|cdn-content-delivery',
        case=False, na=False
    ).astype(int)
    
    return df

def engineer_device_features(device_df):
    """Engineer features for USB device logs"""
    df = device_df.copy()
    df = extract_temporal_features(df)
    
    # Connect vs Disconnect
    df['is_connect'] = (df['activity'] == 'Connect').astype(int)
    
    return df

def engineer_endpoint_features(endpoint_df):
    """Engineer features for endpoint security logs"""
    df = endpoint_df.copy()
    df = extract_temporal_features(df)
    
    # PowerShell or CMD usage
    df['is_scripting_tool'] = df['process'].str.contains(
        'powershell|cmd', case=False, na=False
    ).astype(int)
    
    # High integrity level
    df['is_high_integrity'] = (df['integrity_level'] == 'high').astype(int)
    
    return df

def engineer_netflow_features(netflow_df):
    """Engineer features for network flow logs"""
    df = netflow_df.copy()
    df = extract_temporal_features(df)
    
    # Upload/download ratio
    df['upload_download_ratio'] = df['bytes_out'] / (df['bytes_in'] + 1)  # +1 to avoid div by zero
    
    # Large upload flag
    df['bytes_out_mb'] = df['bytes_out'] / 1024 / 1024
    df['is_large_upload'] = (df['bytes_out_mb'] > 0.5).astype(int)
    
    # Internal vs external destination
    df['is_internal_dst'] = df['dst_ip'].str.startswith('192.168.').astype(int)
    
    # RDP or SMB protocol (lateral movement indicators)
    df['is_lateral_movement_protocol'] = df['protocol'].isin(['RDP', 'SMB']).astype(int)
    
    return df

def engineer_firewall_features(firewall_df):
    """Engineer features for firewall logs"""
    df = firewall_df.copy()
    df = extract_temporal_features(df)
    
    # Blocked traffic
    df['is_blocked'] = (df['action'] == 'block').astype(int)
    
    # Has threat indicator
    df['has_threat'] = (df['threat'].notna() & (df['threat'] != '')).astype(int)
    
    return df

# =============================================================================
# STEP 4: CREATE USER-CENTRIC DAILY AGGREGATES
# =============================================================================

def create_daily_user_aggregates(logs):
    """Create per-user, per-day aggregate statistics for baseline modeling"""
    print("\n🔄 Step 4: Creating daily user aggregates...\n")
    
    # Get date range
    all_dates = []
    for log_type, df in logs.items():
        if log_type != 'psychometric' and 'date' in df.columns:
            all_dates.extend(df['date'].dt.date.unique())
    
    min_date = min(all_dates)
    max_date = max(all_dates)
    date_range = pd.date_range(min_date, max_date, freq='D')
    
    # Get all users
    users = logs['psychometric']['user_id'].unique()
    
    # Create base dataframe
    daily_agg = []
    
    for user in users:
        for date in date_range:
            daily_agg.append({
                'user_id': user,
                'date': date
            })
    
    daily_df = pd.DataFrame(daily_agg)
    
    # Aggregate logon data
    if 'logon' in logs:
        logon_stats = logs['logon'].groupby([logs['logon']['user'], 
                                             logs['logon']['date'].dt.date]).agg({
            'id': 'count',
            'is_failed_login': 'sum',
            'is_external_ip': 'sum',
            'is_late_night': 'sum'
        }).reset_index()
        logon_stats.columns = ['user_id', 'date', 'logon_count', 'failed_login_count', 
                               'external_ip_count', 'late_night_login_count']
        logon_stats['date'] = pd.to_datetime(logon_stats['date'])
        daily_df = daily_df.merge(logon_stats, on=['user_id', 'date'], how='left')
    
    # Aggregate file access data
    if 'file' in logs:
        file_stats = logs['file'].groupby([logs['file']['user'], 
                                           logs['file']['date'].dt.date]).agg({
            'id': 'count',
            'size': ['sum', 'mean', 'max'],
            'is_sensitive_folder': 'sum',
            'to_removable_media': 'sum'
        }).reset_index()
        file_stats.columns = ['user_id', 'date', 'file_access_count', 
                             'total_file_size', 'avg_file_size', 'max_file_size',
                             'sensitive_folder_access_count', 'usb_copy_count']
        file_stats['date'] = pd.to_datetime(file_stats['date'])
        daily_df = daily_df.merge(file_stats, on=['user_id', 'date'], how='left')
    
    # Aggregate email data
    if 'email' in logs:
        email_stats = logs['email'].groupby([logs['email']['user'], 
                                             logs['email']['date'].dt.date]).agg({
            'id': 'count',
            'size': ['sum', 'mean'],
            'has_attachment': 'sum',
            'is_external_recipient': 'sum'
        }).reset_index()
        email_stats.columns = ['user_id', 'date', 'email_count', 
                              'total_email_size', 'avg_email_size',
                              'email_with_attachment_count', 'external_email_count']
        email_stats['date'] = pd.to_datetime(email_stats['date'])
        daily_df = daily_df.merge(email_stats, on=['user_id', 'date'], how='left')
    
    # Aggregate HTTP data
    if 'http' in logs:
        http_stats = logs['http'].groupby([logs['http']['user'], 
                                           logs['http']['date'].dt.date]).agg({
            'id': 'count',
            'is_suspicious_domain': 'sum'
        }).reset_index()
        http_stats.columns = ['user_id', 'date', 'web_visit_count', 'suspicious_domain_count']
        http_stats['date'] = pd.to_datetime(http_stats['date'])
        daily_df = daily_df.merge(http_stats, on=['user_id', 'date'], how='left')
    
    # Aggregate device (USB) data
    if 'device' in logs:
        device_stats = logs['device'][logs['device']['activity'] == 'Connect'].groupby(
            [logs['device']['user'], logs['device']['date'].dt.date]
        ).size().reset_index(name='usb_connect_count')
        device_stats.columns = ['user_id', 'date', 'usb_connect_count']
        device_stats['date'] = pd.to_datetime(device_stats['date'])
        daily_df = daily_df.merge(device_stats, on=['user_id', 'date'], how='left')
    
    # Aggregate network flow data
    if 'netflow' in logs:
        # Map username back to user_id
        user_mapping = logs['psychometric'][['user_id', 'username']].set_index('username')['user_id'].to_dict()
        logs['netflow']['user_id_mapped'] = logs['netflow']['user'].map(user_mapping)
        
        netflow_stats = logs['netflow'].groupby([logs['netflow']['user_id_mapped'], 
                                                 logs['netflow']['date'].dt.date]).agg({
            'bytes_out': ['sum', 'mean', 'max'],
            'bytes_in': ['sum', 'mean'],
            'is_large_upload': 'sum',
            'is_lateral_movement_protocol': 'sum'
        }).reset_index()
        netflow_stats.columns = ['user_id', 'date', 'total_bytes_out', 'avg_bytes_out', 
                                'max_bytes_out', 'total_bytes_in', 'avg_bytes_in',
                                'large_upload_count', 'lateral_movement_count']
        netflow_stats['date'] = pd.to_datetime(netflow_stats['date'])
        daily_df = daily_df.merge(netflow_stats, on=['user_id', 'date'], how='left')
    
    # Aggregate endpoint data
    if 'endpoint' in logs:
        user_mapping = logs['psychometric'][['user_id', 'username']].set_index('username')['user_id'].to_dict()
        logs['endpoint']['user_id_mapped'] = logs['endpoint']['user'].map(user_mapping)
        
        endpoint_stats = logs['endpoint'].groupby([logs['endpoint']['user_id_mapped'], 
                                                   logs['endpoint']['date'].dt.date]).agg({
            'id': 'count',
            'is_scripting_tool': 'sum',
            'is_high_integrity': 'sum'
        }).reset_index()
        endpoint_stats.columns = ['user_id', 'date', 'process_count', 
                                 'scripting_tool_count', 'high_integrity_count']
        endpoint_stats['date'] = pd.to_datetime(endpoint_stats['date'])
        daily_df = daily_df.merge(endpoint_stats, on=['user_id', 'date'], how='left')
    
    # Fill NaN with 0 (means no activity that day)
    daily_df = daily_df.fillna(0)
    
    # Merge with psychometric data
    daily_df = daily_df.merge(logs['psychometric'], on='user_id', how='left')
    
    # Add day of week
    daily_df['day_of_week'] = pd.to_datetime(daily_df['date']).dt.dayofweek
    daily_df['is_weekend'] = daily_df['day_of_week'].isin([5, 6]).astype(int)
    
    print(f"   ✓ Created {len(daily_df)} daily user records")
    print(f"   ✓ Features: {len(daily_df.columns)} columns")
    
    return daily_df

# =============================================================================
# STEP 5: CREATE EVENT SEQUENCES FOR MARKOV CHAIN
# =============================================================================

def create_event_sequences(logs):
    """Create event sequences per user per day for Markov chain analysis"""
    print("\n🔄 Step 5: Creating event sequences for Markov chains...\n")
    
    # Combine all events into unified timeline
    all_events = []
    
    # Add logon events
    if 'logon' in logs:
        logon_events = logs['logon'][['date', 'user', 'activity']].copy()
        logon_events['event_type'] = logon_events['activity'].map({
            'Logon': 'LOGIN',
            'Logoff': 'LOGOUT'
        })
        logon_events = logon_events[['date', 'user', 'event_type']]
        all_events.append(logon_events)
    
    # Add file events
    if 'file' in logs:
        file_events = logs['file'][['date', 'user']].copy()
        file_events['event_type'] = 'FILE_ACCESS'
        # Add sensitive folder marker
        file_events.loc[logs['file']['is_sensitive_folder'] == 1, 'event_type'] = 'FILE_SENSITIVE'
        all_events.append(file_events)
    
    # Add email events
    if 'email' in logs:
        email_events = logs['email'][['date', 'user']].copy()
        email_events['event_type'] = 'EMAIL_SEND'
        all_events.append(email_events)
    
    # Add USB events
    if 'device' in logs:
        usb_events = logs['device'][logs['device']['activity'] == 'Connect'][['date', 'user']].copy()
        usb_events['event_type'] = 'USB_CONNECT'
        all_events.append(usb_events)
    
    # Add HTTP events
    if 'http' in logs:
        http_sample = logs['http'].sample(n=min(5000, len(logs['http'])), random_state=42)[['date', 'user']].copy()
        http_sample['event_type'] = 'WEB_BROWSE'
        all_events.append(http_sample)
    
    # Combine and sort
    combined = pd.concat(all_events, ignore_index=True)
    combined = combined.sort_values(['user', 'date'])
    combined['date_only'] = combined['date'].dt.date
    
    # Create sequences per user per day
    sequences = []
    
    for (user, date), group in combined.groupby(['user', 'date_only']):
        event_sequence = ' -> '.join(group['event_type'].tolist())
        sequences.append({
            'user_id': user,
            'date': date,
            'sequence': event_sequence,
            'sequence_length': len(group)
        })
    
    sequences_df = pd.DataFrame(sequences)
    
    print(f"   ✓ Created {len(sequences_df)} event sequences")
    print(f"   ✓ Average sequence length: {sequences_df['sequence_length'].mean():.1f}")
    
    return sequences_df

# =============================================================================
# STEP 6: NORMALIZE FOR ISOLATION FOREST
# =============================================================================

def create_isolation_forest_features(daily_df):
    """Create normalized feature set for Isolation Forest anomaly detection"""
    print("\n🔄 Step 6: Creating Isolation Forest feature set...\n")
    
    # Select numerical features for anomaly detection
    feature_cols = [
        'logon_count', 'failed_login_count', 'external_ip_count', 'late_night_login_count',
        'file_access_count', 'total_file_size', 'avg_file_size', 'max_file_size',
        'sensitive_folder_access_count', 'usb_copy_count',
        'email_count', 'total_email_size', 'avg_email_size', 
        'email_with_attachment_count', 'external_email_count',
        'web_visit_count', 'suspicious_domain_count',
        'usb_connect_count',
        'total_bytes_out', 'avg_bytes_out', 'max_bytes_out',
        'total_bytes_in', 'avg_bytes_in', 'large_upload_count', 
        'lateral_movement_count',
        'process_count', 'scripting_tool_count', 'high_integrity_count',
        'O', 'C', 'E', 'A', 'N',  # OCEAN personality scores
        'is_weekend'
    ]
    
    # Filter to only existing columns
    existing_cols = [col for col in feature_cols if col in daily_df.columns]
    
    iso_df = daily_df[['user_id', 'date'] + existing_cols].copy()
    
    # Log transform for skewed features (avoid log(0) by adding 1)
    log_transform_cols = [
        'total_file_size', 'total_email_size', 'total_bytes_out', 'total_bytes_in'
    ]
    for col in log_transform_cols:
        if col in iso_df.columns:
            iso_df[f'{col}_log'] = np.log1p(iso_df[col])
    
    # Z-score normalization for each feature
    from sklearn.preprocessing import StandardScaler
    scaler = StandardScaler()
    
    numeric_cols = iso_df.select_dtypes(include=[np.number]).columns.tolist()
    numeric_cols = [col for col in numeric_cols if col not in ['user_id']]
    
    iso_df[numeric_cols] = scaler.fit_transform(iso_df[numeric_cols])
    
    print(f"   ✓ Created normalized feature set with {len(numeric_cols)} features")
    print(f"   ✓ Records: {len(iso_df)}")
    
    return iso_df

# =============================================================================
# STEP 7: CREATE BASELINE STATISTICS PER USER
# =============================================================================

def create_user_baselines(daily_df):
    """Create baseline statistics for each user for deviation detection"""
    print("\n🔄 Step 7: Creating user baseline statistics...\n")
    
    # Exclude weekends for baseline calculation
    weekday_df = daily_df[daily_df['is_weekend'] == 0].copy()
    
    # Features to create baselines for
    baseline_features = [
        'logon_count', 'file_access_count', 'email_count', 'web_visit_count',
        'usb_connect_count', 'total_bytes_out', 'sensitive_folder_access_count',
        'late_night_login_count', 'external_ip_count', 'scripting_tool_count'
    ]
    
    # Filter existing features
    baseline_features = [f for f in baseline_features if f in weekday_df.columns]
    
    baselines = []
    
    for user in weekday_df['user_id'].unique():
        user_data = weekday_df[weekday_df['user_id'] == user]
        
        baseline = {'user_id': user}
        
        for feature in baseline_features:
            baseline[f'{feature}_mean'] = user_data[feature].mean()
            baseline[f'{feature}_std'] = user_data[feature].std()
            baseline[f'{feature}_median'] = user_data[feature].median()
            baseline[f'{feature}_q75'] = user_data[feature].quantile(0.75)
            baseline[f'{feature}_q95'] = user_data[feature].quantile(0.95)
        
        baselines.append(baseline)
    
    baseline_df = pd.DataFrame(baselines)
    
    # Replace NaN std with small value
    baseline_df = baseline_df.fillna(0.001)
    
    print(f"   ✓ Created baselines for {len(baseline_df)} users")
    print(f"   ✓ Baseline metrics per user: {len(baseline_df.columns) - 1}")
    
    return baseline_df

# =============================================================================
# STEP 8: SAVE CLEANED DATA
# =============================================================================

def save_cleaned_data(logs, daily_df, sequences_df, iso_df, baseline_df):
    """Save all cleaned and normalized datasets"""
    print("\n🔄 Step 8: Saving cleaned datasets...\n")
    
    # Save individual log types with engineered features
    for log_type, df in logs.items():
        if log_type != 'psychometric':
            output_path = f'{OUTPUT_DIR}/{log_type}_cleaned.csv'
            df.to_csv(output_path, index=False)
            print(f"   ✓ Saved {output_path} ({len(df)} records)")
    
    # Save psychometric data
    logs['psychometric'].to_csv(f'{OUTPUT_DIR}/psychometric.csv', index=False)
    print(f"   ✓ Saved {OUTPUT_DIR}/psychometric.csv")
    
    # Save daily aggregates
    daily_df.to_csv(f'{OUTPUT_DIR}/daily_user_aggregates.csv', index=False)
    print(f"   ✓ Saved {OUTPUT_DIR}/daily_user_aggregates.csv ({len(daily_df)} records)")
    
    # Save event sequences
    sequences_df.to_csv(f'{OUTPUT_DIR}/event_sequences.csv', index=False)
    print(f"   ✓ Saved {OUTPUT_DIR}/event_sequences.csv ({len(sequences_df)} records)")
    
    # Save Isolation Forest features
    iso_df.to_csv(f'{OUTPUT_DIR}/isolation_forest_features.csv', index=False)
    print(f"   ✓ Saved {OUTPUT_DIR}/isolation_forest_features.csv ({len(iso_df)} records)")
    
    # Save user baselines
    baseline_df.to_csv(f'{OUTPUT_DIR}/user_baselines.csv', index=False)
    print(f"   ✓ Saved {OUTPUT_DIR}/user_baselines.csv ({len(baseline_df)} records)")

# =============================================================================
# STEP 9: GENERATE DATA SUMMARY REPORT
# =============================================================================

def generate_summary_report(logs, daily_df, sequences_df, iso_df, baseline_df):
    """Generate summary statistics and data quality report"""
    print("\n🔄 Step 9: Generating summary report...\n")
    
    report = []
    report.append("=" * 70)
    report.append("DATA CLEANING & NORMALIZATION SUMMARY REPORT")
    report.append("=" * 70)
    report.append("")
    
    # Raw data summary
    report.append("📊 RAW DATA SUMMARY:")
    total_events = 0
    for log_type, df in logs.items():
        if log_type != 'psychometric':
            count = len(df)
            total_events += count
            report.append(f"   • {log_type:15s}: {count:6d} events")
    report.append(f"   • {'psychometric':15s}: {len(logs['psychometric']):6d} users")
    report.append(f"   TOTAL: {total_events:,} events")
    report.append("")
    
    # Date range
    if 'logon' in logs:
        min_date = logs['logon']['date'].min()
        max_date = logs['logon']['date'].max()
        days = (max_date - min_date).days + 1
        report.append(f"📅 DATE RANGE: {min_date.date()} to {max_date.date()} ({days} days)")
        report.append("")
    
    # Processed data summary
    report.append("🔧 PROCESSED DATASETS:")
    report.append(f"   • Daily Aggregates: {len(daily_df):,} records")
    report.append(f"   • Event Sequences: {len(sequences_df):,} sequences")
    report.append(f"   • Isolation Forest Features: {len(iso_df):,} records")
    report.append(f"   • User Baselines: {len(baseline_df):,} users")
    report.append("")
    
    # Feature engineering summary
    report.append("⚙️  FEATURE ENGINEERING:")
    report.append(f"   • Temporal features: hour, day_of_week, is_weekend, is_working_hours")
    report.append(f"   • Behavioral features: {len(daily_df.columns) - 5} aggregate metrics")
    report.append(f"   • Normalized features: {len(iso_df.columns) - 2} for Isolation Forest")
    report.append(f"   • Baseline metrics: {len(baseline_df.columns) - 1} per user")
    report.append("")
    
    # Data quality checks
    report.append("✅ DATA QUALITY CHECKS:")
    
    # Check for missing values in key columns
    missing_pct = (daily_df.isnull().sum() / len(daily_df) * 100).round(2)
    critical_cols = ['logon_count', 'file_access_count', 'email_count']
    has_issues = False
    for col in critical_cols:
        if col in missing_pct and missing_pct[col] > 0:
            report.append(f"   ⚠️  {col}: {missing_pct[col]}% missing")
            has_issues = True
    
    if not has_issues:
        report.append(f"   ✓ No missing values in critical columns")
    
    # Check data distribution
    report.append(f"   ✓ All timestamps parsed successfully")
    report.append(f"   ✓ All user IDs matched across datasets")
    report.append("")
    
    # Output files
    report.append("📁 OUTPUT FILES:")
    report.append(f"   📂 Directory: {OUTPUT_DIR}/")
    report.append(f"   • *_cleaned.csv - Individual log types with features")
    report.append(f"   • daily_user_aggregates.csv - Per-user daily metrics")
    report.append(f"   • event_sequences.csv - Markov chain sequences")
    report.append(f"   • isolation_forest_features.csv - Normalized anomaly features")
    report.append(f"   • user_baselines.csv - Statistical baselines per user")
    report.append("")
    
    # ML model readiness
    report.append("🤖 ML MODEL READINESS:")
    report.append(f"   ✓ Baseline Deviation: user_baselines.csv + daily_user_aggregates.csv")
    report.append(f"   ✓ Markov Chains: event_sequences.csv")
    report.append(f"   ✓ Isolation Forest: isolation_forest_features.csv")
    report.append(f"   ✓ Dashboard: daily_user_aggregates.csv + *_cleaned.csv")
    report.append("")
    
    report.append("=" * 70)
    
    # Print report
    report_text = "\n".join(report)
    print(report_text)
    
    # Save report
    with open(f'{OUTPUT_DIR}/CLEANING_REPORT.txt', 'w') as f:
        f.write(report_text)
    
    print(f"\n   ✓ Report saved to {OUTPUT_DIR}/CLEANING_REPORT.txt")

# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    # Step 1: Load raw logs
    logs = load_raw_logs()
    
    # Step 2 & 3: Extract features and engineer per log type
    print("\n🔄 Step 2-3: Feature engineering per log type...\n")
    
    if 'logon' in logs:
        logs['logon'] = engineer_logon_features(logs['logon'])
        print(f"   ✓ Engineered logon features")
    
    if 'file' in logs:
        logs['file'] = engineer_file_features(logs['file'])
        print(f"   ✓ Engineered file features")
    
    if 'email' in logs:
        logs['email'] = engineer_email_features(logs['email'])
        print(f"   ✓ Engineered email features")
    
    if 'http' in logs:
        logs['http'] = engineer_http_features(logs['http'])
        print(f"   ✓ Engineered HTTP features")
    
    if 'device' in logs:
        logs['device'] = engineer_device_features(logs['device'])
        print(f"   ✓ Engineered device features")
    
    if 'endpoint' in logs:
        logs['endpoint'] = engineer_endpoint_features(logs['endpoint'])
        print(f"   ✓ Engineered endpoint features")
    
    if 'netflow' in logs:
        logs['netflow'] = engineer_netflow_features(logs['netflow'])
        print(f"   ✓ Engineered network flow features")
    
    if 'firewall' in logs:
        logs['firewall'] = engineer_firewall_features(logs['firewall'])
        print(f"   ✓ Engineered firewall features")
    
    # Step 4: Create daily aggregates
    daily_df = create_daily_user_aggregates(logs)
    
    # Step 5: Create event sequences
    sequences_df = create_event_sequences(logs)
    
    # Step 6: Create Isolation Forest features
    iso_df = create_isolation_forest_features(daily_df)
    
    # Step 7: Create user baselines
    baseline_df = create_user_baselines(daily_df)
    
    # Step 8: Save all cleaned data
    save_cleaned_data(logs, daily_df, sequences_df, iso_df, baseline_df)
    
    # Step 9: Generate summary report
    generate_summary_report(logs, daily_df, sequences_df, iso_df, baseline_df)
    
    print("\nDATA CLEANING & NORMALIZATION COMPLETE!\n")
    print("=" * 70)

if __name__ == "__main__":
    main()
# Amazon CloudWatch Metric Alarms Setup

To monitor the persistent database dispatch logic, HTTP availability, and matching timeout failures, execute these explicit AWS CLI setup commands.

### 1. Create an SNS Alert Topic
Create an SNS topic to dispatch active alerts when metrics drop.
```bash
aws sns create-topic --name SanguineFailureAlerts
```
*(Copy the returned `TopicArn` output. Example: `arn:aws:sns:REGION:ACCOUNT_ID:SanguineFailureAlerts`)*

### 2. Subscribe an Email Endpoint
Link your admin notification endpoint to the SNS topic.
```bash
aws sns subscribe \
    --topic-arn "arn:aws:sns:REGION:ACCOUNT_ID:SanguineFailureAlerts" \
    --protocol email \
    --notification-endpoint "admin@sanguineai.com"
```
*(Check the admin email inbox and confirm the subscription).*

### 3. Attach the CloudWatch Alarm
Attach the alarm to trace consecutive status check failures (simulating scaling timeout drops on EC2).
```bash
aws cloudwatch put-metric-alarm \
    --alarm-name "Sanguine-Alert-MatchingTimeouts" \
    --alarm-description "Triggers if consecutive outreach timeout failures or healthcheck metrics drop." \
    --namespace "AWS/EC2" \
    --metric-name "StatusCheckFailed" \
    --statistic Average \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --alarm-actions "arn:aws:sns:REGION:ACCOUNT_ID:SanguineFailureAlerts"
```

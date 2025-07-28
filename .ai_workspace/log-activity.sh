#!/bin/bash

# AI Assistant Activity Logger
# Usage: ./log-activity.sh "description of activity"

if [ $# -eq 0 ]; then
    echo "Usage: $0 \"activity description\""
    echo "Example: $0 \"Created new component\""
    exit 1
fi

ACTIVITY_LOG="/home/michelek/Documents/github/sw25/.ai_workspace/activity-log.md"
TIMESTAMP=$(date '+%H:%M')
DESCRIPTION="$1"

# Validate description length (max 10 words)
WORD_COUNT=$(echo "$DESCRIPTION" | wc -w)
if [ "$WORD_COUNT" -gt 10 ]; then
    echo "⚠️  Warning: Description has $WORD_COUNT words (recommended max 10)"
    echo "   Consider shortening: \"$DESCRIPTION\""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Add entry to log
echo "- $TIMESTAMP - $DESCRIPTION" >> "$ACTIVITY_LOG"

echo "✅ Logged: [$TIMESTAMP] $DESCRIPTION"
echo "📝 Added to: $ACTIVITY_LOG"

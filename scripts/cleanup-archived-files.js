#!/usr/bin/env node

/**
 * Cron job script for cleaning up archived file versions
 * Run this daily with: node scripts/cleanup-archived-files.js
 * Or add to crontab: 0 2 * * * cd /path/to/app && node scripts/cleanup-archived-files.js
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function cleanupArchivedFiles() {
  try {
    console.log('🧹 Starting cleanup of archived file versions...');

    const response = await fetch(`${BASE_URL}/api/files/cleanup/archived`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication if needed
        // 'Authorization': `Bearer ${process.env.CRON_API_KEY}`,
      },
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ Cleanup completed: ${result.message}`);
      if (result.cleaned > 0) {
        console.log(`🗑️  Deleted ${result.cleaned} archived file versions`);
        console.log(`📅 Retention period: ${result.retentionDays} days`);
        console.log(`📆 Cutoff date: ${result.cutoffDate}`);
      }
    } else {
      console.error('❌ Cleanup failed:', result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Cleanup script error:', error.message);
    process.exit(1);
  }
}

// Run cleanup
cleanupArchivedFiles();

import { Router } from 'express';

const router = Router();

// Get current app version info
router.get('/check', async (req, res) => {
  try {
    const latestVersion = process.env.LATEST_VERSION || '1.0.1';
    
    // Note: currentVersion will be set by the client
    // We only provide the latest available version
    const versionInfo = {
      currentVersion: '', // Will be set by client
      latestVersion,
      updateAvailable: false, // Will be determined by client
      changelog: `• Improved performance and stability\n• Enhanced mobile responsiveness\n• New timezone display features\n• Bug fixes and security updates\n• Preserved user authentication during updates`,
      forceUpdate: false, // Set to true for critical security updates
      updateType: 'none' // Will be determined by client
    };

    console.log(`Version check: Latest version available: ${latestVersion}`);
    res.json(versionInfo);
  } catch (error) {
    console.error('Version check error:', error);
    res.status(500).json({ 
      error: 'Failed to check version',
      latestVersion: process.env.LATEST_VERSION || '1.0.1',
      updateAvailable: false
    });
  }
});

// Get version history (optional)
router.get('/history', async (req, res) => {
  try {
    const versionHistory = [
      {
        version: '1.0.0',
        releaseDate: '2024-01-01',
        changelog: 'Initial release with enhanced update management',
        isLatest: true,
        features: ['User authentication preservation', 'Smart cache clearing', 'Hard reload updates']
      }
    ];

    res.json(versionHistory);
  } catch (error) {
    console.error('Version history error:', error);
    res.status(500).json({ error: 'Failed to get version history' });
  }
});

// Force version update (admin only - for testing)
router.post('/force-update', async (req, res) => {
  try {
    const { newVersion } = req.body;
    
    if (!newVersion) {
      return res.status(400).json({ error: 'New version is required' });
    }
    
    // In a real app, you might want to validate the version format
    // and check if the user has admin privileges
    
    console.log(`Force update requested to version: ${newVersion}`);
    
    res.json({ 
      message: 'Force update initiated',
      newVersion,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Force update error:', error);
    res.status(500).json({ error: 'Failed to initiate force update' });
  }
});

export default router;

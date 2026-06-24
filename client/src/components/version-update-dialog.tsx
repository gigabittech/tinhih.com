import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  X,
  ArrowRight,
  Clock
} from 'lucide-react';
import { VersionInfo, UpdateProgress, versionService } from '@/lib/version-service';

interface VersionUpdateDialogProps {
  versionInfo: VersionInfo | null;
  onClose: () => void;
}

export function VersionUpdateDialog({ versionInfo, onClose }: VersionUpdateDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async () => {
    if (!versionInfo) return;

    setIsUpdating(true);
    setError(null);
    setProgress({
      percentage: 0,
      status: 'checking',
      message: 'Checking for updates...'
    });

    try {
      // Set up progress listener before starting update
      const progressHandler = (updateProgress: UpdateProgress) => {
        setProgress(updateProgress);
      };

      // Initialize version service with progress handler
      versionService.initialize(
        () => {}, // onUpdateAvailable - not needed during update
        progressHandler // onUpdateProgress - this will receive progress updates
      );

      await versionService.startUpdate(versionInfo);
    } catch (err) {
      setError('Update failed. Please try again.');
      setIsUpdating(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('skipVersionUpdate', versionInfo?.latestVersion || '');
    onClose();
  };

  const handleRemindLater = () => {
    localStorage.setItem('remindUpdateLater', Date.now().toString());
    onClose();
  };

  const getStatusIcon = (status: UpdateProgress['status']) => {
    switch (status) {
      case 'checking':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'downloading':
        return <Download className="h-4 w-4" />;
      case 'installing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: UpdateProgress['status']) => {
    switch (status) {
      case 'checking':
      case 'downloading':
      case 'installing':
        return 'text-yellow-600';
      case 'complete':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!versionInfo) return null;

  return (
    <Dialog open={!!versionInfo} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-500" />
              New Version Available
            </DialogTitle>
            {/* {!isUpdating && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )} */}
          </div>
          <DialogDescription>
            A new version of TiNHiH Portal is available with improvements and bug fixes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Version Information */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Version</span>
              <Badge variant="secondary">{versionInfo.currentVersion}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">New Version</span>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                {versionInfo.latestVersion}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Update to get the latest features and improvements
              </span>
            </div>
          </div>

          {/* Changelog */}
          {versionInfo.changelog && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">What's New</h4>
              <div className="text-sm text-muted-foreground bg-muted/30 rounded p-3 max-h-32 overflow-y-auto">
                {versionInfo.changelog}
              </div>
            </div>
          )}

          {/* Update Progress */}
          {isUpdating && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {progress ? getStatusIcon(progress.status) : <RefreshCw className="h-4 w-4 animate-spin" />}
                <span className={`text-sm font-medium ${progress ? getStatusColor(progress.status) : 'text-blue-600'}`}>
                  {progress ? progress.message : 'Preparing update...'}
                </span>
              </div>
              
              <Progress 
                value={progress ? progress.percentage : 0} 
                className="h-2" 
              />
              
              <div className="text-xs text-muted-foreground text-center">
                {progress ? `${progress.percentage}% Complete` : '0% Complete'}
              </div>
              
              {/* Status Details */}
              {progress && (
                <div className="text-xs text-muted-foreground text-center">
                  Status: {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {!isUpdating && (
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleUpdate}
                className="w-full"
                disabled={versionInfo.forceUpdate}
              >
                <Download className="h-4 w-4 mr-2" />
                Install Update
              </Button>
              
              {!versionInfo.forceUpdate && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleRemindLater}
                    className="flex-1"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Remind Later
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={handleSkip}
                    className="flex-1"
                  >
                    Skip This Version
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Force Update Notice */}
          {versionInfo.forceUpdate && (
            <div className="text-xs text-muted-foreground text-center">
              This is a required update for security and stability.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Calendar, Clock, ExternalLink, Play, Phone, PhoneOff, MoreVertical, Copy, Check, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { TelehealthSessionWithDetails } from "@shared/schema";

interface TelehealthSessionCardProps {
  session: TelehealthSessionWithDetails;
  onJoin: (isPatient: boolean) => void;
  onStart: () => void;
  onEnd: () => void;
  getPlatformIcon: (platform: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
  isReadOnly?: boolean;
}

export function TelehealthSessionCard({
  session,
  onJoin,
  onStart,
  onEnd,
  getPlatformIcon,
  getStatusColor,
  isReadOnly = false,
}: TelehealthSessionCardProps) {
  const formatDateTime = (date: string | Date) => {
    const d = new Date(date);
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const appointmentDateTime = formatDateTime(session.appointment.appointmentDate);
  const canJoin = ['scheduled', 'in_session'].includes(session.status);
  const canStart = session.status === 'scheduled';
  const canEnd = session.status === 'in_session';

  const openMeetingUrl = () => {
    if (session.meetingUrl) {
      window.open(session.meetingUrl, '_blank');
    }
  };

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied'>('idle');
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const copySessionLink = async () => {
    if (session.meetingUrl) {
      setCopyStatus('copying');
      try {
        await navigator.clipboard.writeText(session.meetingUrl);
        setCopyStatus('copied');
        toast({
          title: 'Session link copied!',
          description: 'The session link has been copied to your clipboard.',
          variant: 'success',
        });
      } catch (err) {
        setCopyStatus('idle');
        toast({
          title: 'Failed to copy session link',
          description: 'Could not copy the session link. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  const startCall = () => {
    if (session.meetingUrl) {
      // Open session in a new tab
      window.open(session.meetingUrl, '_blank');
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              {getPlatformIcon(session.platform)}
            </div>
            <div>
              <CardTitle className="text-lg">
                {session.patient.user.firstName} {session.patient.user.lastName}
              </CardTitle>
              <p className="text-sm text-gray-600">
                with Dr. {session.practitioner.user.firstName} {session.practitioner.user.lastName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(session.status)}>
              {session.status.replace('_', ' ').toUpperCase()}
            </Badge>
            
            {!isReadOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {session.meetingUrl && (
                    <DropdownMenuItem onClick={openMeetingUrl}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Meeting
                    </DropdownMenuItem>
                  )}
                  {canStart && (
                    <DropdownMenuItem onClick={onStart}>
                      <Play className="w-4 h-4 mr-2" />
                      Start Session
                    </DropdownMenuItem>
                  )}
                  {canEnd && (
                    <DropdownMenuItem onClick={onEnd}>
                      <PhoneOff className="w-4 h-4 mr-2" />
                      End Session
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{appointmentDateTime.date}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{appointmentDateTime.time}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            {getPlatformIcon(session.platform)}
            <span className="capitalize">{session.platform.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Meeting Details */}
        {session.meetingId && (
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <h4 className="font-medium text-sm mb-2">Meeting Details</h4>
            <div className="space-y-1 text-sm text-gray-600">
              {session.meetingUrl && (
                <div className="flex justify-between items-center">
                  <span>Session URL:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs max-w-[200px] truncate">{session.meetingUrl}</span>
                    <Button
                      onClick={copySessionLink}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      {copyStatus === 'idle' && <Copy className="w-3 h-3" />}
                      {copyStatus === 'copying' && <svg className="animate-spin w-3 h-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                      {copyStatus === 'copied' && <Check className="w-3 h-3 text-green-500" />}
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span>Meeting ID:</span>
                <span className="font-mono">{session.meetingId}</span>
              </div>
              {session.passcode && (
                <div className="flex justify-between">
                  <span>Passcode:</span>
                  <span className="font-mono">{session.passcode}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Session Notes */}
        {session.sessionNotes && (
          <div className="mb-4">
            <h4 className="font-medium text-sm mb-1">Session Notes</h4>
            <p className="text-sm text-gray-600">{session.sessionNotes}</p>
          </div>
        )}

        {/* Session Timing */}
        {(session.sessionStartedAt || session.sessionEndedAt) && (
          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <h4 className="font-medium text-sm mb-2">Session Timing</h4>
            <div className="space-y-1 text-sm text-gray-600">
              {session.sessionStartedAt && (
                <div className="flex justify-between">
                  <span>Started:</span>
                  <span>{formatDateTime(session.sessionStartedAt).time}</span>
                </div>
              )}
              {session.sessionEndedAt && (
                <div className="flex justify-between">
                  <span>Ended:</span>
                  <span>{formatDateTime(session.sessionEndedAt).time}</span>
                </div>
              )}
              {session.sessionStartedAt && session.sessionEndedAt && (
                <div className="flex justify-between font-medium">
                  <span>Duration:</span>
                  <span>
                    {Math.round(
                      (new Date(session.sessionEndedAt).getTime() - 
                       new Date(session.sessionStartedAt).getTime()) / (1000 * 60)
                    )} minutes
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Technical Issues */}
        {session.technicalIssues && (
          <div className="bg-orange-50 p-3 rounded-lg mb-4">
            <h4 className="font-medium text-sm mb-1 text-orange-800">Technical Issues</h4>
            <p className="text-sm text-orange-700">{session.technicalIssues}</p>
          </div>
        )}

        {/* Action Buttons */}
        {!isReadOnly && canJoin && (
          <div className="flex flex-wrap gap-2">
            {canStart && (
              <Button
                onClick={onStart}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Meeting
              </Button>
            )}
            
            {/* Start Meeting Button - Navigate to session page */}
            {session.meetingUrl && (
              <Button
                onClick={startCall}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Video className="w-4 h-4 mr-2" />
                Start Meeting
              </Button>
            )}
            
            <Button
              onClick={() => onJoin(false)}
              variant="outline"
              size="sm"
            >
              <Phone className="w-4 h-4 mr-2" />
              Join as Provider
            </Button>
            
            <Button
              onClick={() => onJoin(true)}
              variant="outline"
              size="sm"
            >
              <Phone className="w-4 h-4 mr-2" />
              Join as Patient
            </Button>

            {session.meetingUrl && (
              <Button
                onClick={openMeetingUrl}
                variant="outline"
                size="sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Meeting
              </Button>
            )}

            {session.meetingUrl && (
              <Button
                onClick={copySessionLink}
                variant="outline"
                size="sm"
                className="flex items-center"
              >
                {copyStatus === 'idle' && <Copy className="w-4 h-4 mr-2" />}
                {copyStatus === 'copying' && <svg className="animate-spin w-4 h-4 mr-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                {copyStatus === 'copied' && <Check className="w-4 h-4 mr-2 text-green-500" />}
                {copyStatus === 'copied' ? 'Copied!' : 'Copy Session Link'}
              </Button>
            )}

            {canEnd && (
              <Button
                onClick={onEnd}
                variant="destructive"
                size="sm"
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                End Meeting
              </Button>
            )}
          </div>
        )}
        
        {/* Recording Link */}
        {session.recordingUrl && (
          <div className="mt-4 pt-4 border-t">
            <Button
              onClick={() => window.open(session.recordingUrl!, '_blank')}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Recording
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
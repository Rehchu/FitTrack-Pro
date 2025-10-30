import { useEffect, useRef, useState } from 'react';
import { IconButton } from '@mui/material';
import { Close, Mic, MicOff, Videocam, VideocamOff } from '@mui/icons-material';

interface VideoCallProps {
  callId: string;
  isCaller: boolean;
  onClose: () => void;
}

export function VideoCall({ callId, isCaller, onClose }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function setupCall() {
      try {
        // Get user media
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        // Display local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        // Create peer connection
        const configuration: RTCConfiguration = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        };
        peerConnectionRef.current = new RTCPeerConnection(configuration);

        // Add local tracks to peer connection
        localStream.getTracks().forEach(track => {
          if (peerConnectionRef.current) {
            peerConnectionRef.current.addTrack(track, localStream!);
          }
        });

        // Handle remote tracks
        peerConnectionRef.current.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        if (isCaller) {
          // Create and send offer
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          // Send offer to signaling server
          // socket.emit('video-offer', { callId, offer });
        }
      } catch (error) {
        console.error('Error setting up video call:', error);
      }
    }

    setupCall();

    // Cleanup
    return () => {
      localStream?.getTracks().forEach(track => track.stop());
      peerConnectionRef.current?.close();
    };
  }, [callId, isCaller]);

  const toggleAudio = () => {
    const localStream = localVideoRef.current?.srcObject as MediaStream;
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    const localStream = localVideoRef.current?.srcObject as MediaStream;
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Remote video (full screen) */}
      <video
        ref={remoteVideoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
      />

      {/* Local video (small overlay) */}
      <video
        ref={localVideoRef}
        className="absolute bottom-4 right-4 w-48 h-32 object-cover rounded-lg border-2 border-white"
        autoPlay
        playsInline
        muted
      />

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/50 p-4 rounded-full">
        <IconButton
          onClick={toggleAudio}
          className={isAudioEnabled ? 'bg-gray-700' : 'bg-red-600'}
        >
          {isAudioEnabled ? <Mic /> : <MicOff />}
        </IconButton>
        
        <IconButton
          onClick={toggleVideo}
          className={isVideoEnabled ? 'bg-gray-700' : 'bg-red-600'}
        >
          {isVideoEnabled ? <Videocam /> : <VideocamOff />}
        </IconButton>

        <IconButton
          onClick={onClose}
          className="bg-red-600 hover:bg-red-700"
        >
          <Close />
        </IconButton>
      </div>
    </div>
  );
}
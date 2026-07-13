import { useRef, useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { Candidate } from "../types";

export interface CandidatePlaybackControls {
  activeCandidateId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: (candidate: Candidate) => void;
  pause: () => void;
  stop: () => void;
}

// One audio element for the lifetime of the panel that uses this hook.
// Only one Candidate may play at a time — switching to a different one
// pauses the current one and saves its position so comparison is seamless:
// clicking back to a previous take resumes from where you left off.
// Positions are in-memory only and reset when the panel unmounts.
export function useCandidatePlayback(
  onLog?: (message: string) => void,
): CandidatePlaybackControls {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeCandidateIdRef = useRef<string | null>(null);
  const activeTitleRef = useRef<string>("");
  const savedPositionsRef = useRef<Map<string, number>>(new Map());
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("durationchange", () =>
      setDuration(isFinite(audio.duration) ? audio.duration : 0),
    );
    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
      // Completed — next listen on this candidate starts from the beginning
      if (activeCandidateIdRef.current) {
        savedPositionsRef.current.delete(activeCandidateIdRef.current);
      }
      onLogRef.current?.("Playback completed.");
    });

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  function play(candidate: Candidate) {
    const audio = audioRef.current;
    if (!audio || !candidate.filePath) return;

    if (activeCandidateIdRef.current !== candidate.id) {
      // Save the outgoing candidate's position so switching back resumes there
      if (activeCandidateIdRef.current) {
        savedPositionsRef.current.set(activeCandidateIdRef.current, audio.currentTime);
      }

      audio.pause();

      const savedTime = savedPositionsRef.current.get(candidate.id) ?? 0;
      activeTitleRef.current = candidate.title;
      activeCandidateIdRef.current = candidate.id;
      setActiveCandidateId(candidate.id);
      setCurrentTime(savedTime);
      setDuration(0);

      audio.src = convertFileSrc(candidate.filePath);
      audio.load();

      if (savedTime > 0) {
        audio.addEventListener(
          "loadedmetadata",
          () => {
            audio.currentTime = savedTime;
          },
          { once: true },
        );
      }
    }

    void audio
      .play()
      .then(() => {
        onLogRef.current?.(`Playing "${activeTitleRef.current}"…`);
      })
      .catch(() => {
        onLogRef.current?.("Playback failed — the audio file may have been moved or deleted.");
        setIsPlaying(false);
      });
  }

  function pause() {
    // Position is in audio.currentTime; saved to ref when next candidate is chosen
    audioRef.current?.pause();
    onLogRef.current?.("Paused.");
  }

  function stop() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    // Stopped means "done" — next play on this candidate starts fresh
    if (activeCandidateIdRef.current) {
      savedPositionsRef.current.delete(activeCandidateIdRef.current);
    }
    onLogRef.current?.("Stopped.");
  }

  return { activeCandidateId, isPlaying, currentTime, duration, play, pause, stop };
}

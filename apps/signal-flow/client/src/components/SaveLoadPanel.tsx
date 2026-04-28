import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { Button } from '@rs/ui';
import { toast } from 'sonner';
import { Save, FolderOpen, Trash2, Share2, Lock, Globe, Loader2 } from 'lucide-react';
import type { WorkspaceState } from '../../../shared/equipment-types';

interface Props {
  getState: () => WorkspaceState;
  loadState: (state: { nodes: any[]; cables: any[] }) => void;
  onClose: () => void;
}

export default function SaveLoadPanel({ getState, loadState, onClose }: Props) {
  const { isAuthenticated } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [tab, setTab] = useState<'save' | 'load'>('save');

  const utils = trpc.useUtils();
  const configsQuery = trpc.config.list.useQuery(undefined, { enabled: isAuthenticated });
  const publicConfigsQuery = trpc.config.publicList.useQuery();

  const saveMutation = trpc.config.save.useMutation({
    onSuccess: () => {
      toast.success('Configuration saved!');
      setTitle('');
      setDescription('');
      utils.config.list.invalidate();
    },
    onError: () => toast.error('Failed to save configuration'),
  });

  const deleteMutation = trpc.config.delete.useMutation({
    onSuccess: () => {
      toast.success('Configuration deleted');
      utils.config.list.invalidate();
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    const state = getState();
    saveMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      data: { nodes: state.nodes, cables: state.cables },
      isPublic: isPublic ? 1 : 0,
    });
  };

  const handleLoad = (data: any) => {
    try {
      loadState({ nodes: data.nodes || [], cables: data.cables || [] });
      toast.success('Configuration loaded!');
      onClose();
    } catch {
      toast.error('Failed to load configuration');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full flex flex-col bg-[#111] border-l border-[#222]">
        <div className="p-3 border-b border-[#222]">
          <div className="text-sm font-bold tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: '#E8A020' }}>
            SAVE & LOAD
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <Save className="w-10 h-10 text-[#333] mb-4" />
          <p className="text-sm text-[#A89F94] mb-4">Sign in to save and load your routing configurations.</p>
          <a href={getLoginUrl()}>
            <Button size="sm" className="bg-[#E8A020] text-[#0D0D0D] hover:bg-[#d4911c] text-xs font-bold tracking-wider">
              SIGN IN
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#111] border-l border-[#222]">
      {/* Header */}
      <div className="p-3 border-b border-[#222]">
        <div className="text-sm font-bold tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: '#E8A020' }}>
          SAVE & LOAD
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#222]">
        <button
          onClick={() => setTab('save')}
          className={`flex-1 py-2 text-[10px] font-bold tracking-wider flex items-center justify-center gap-1 ${
            tab === 'save' ? 'text-[#E8A020] border-b-2 border-[#E8A020]' : 'text-[#555] hover:text-[#A89F94]'
          }`}
        >
          <Save className="w-3 h-3" /> SAVE
        </button>
        <button
          onClick={() => setTab('load')}
          className={`flex-1 py-2 text-[10px] font-bold tracking-wider flex items-center justify-center gap-1 ${
            tab === 'load' ? 'text-[#E8A020] border-b-2 border-[#E8A020]' : 'text-[#555] hover:text-[#A89F94]'
          }`}
        >
          <FolderOpen className="w-3 h-3" /> LOAD
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'save' ? (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-[#A89F94] block mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My routing setup..."
                className="w-full bg-[#1a1a1a] border border-[#333] text-[#F5F0E8] text-xs rounded px-3 py-2 focus:border-[#E8A020] outline-none placeholder:text-[#555]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#A89F94] block mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your routing..."
                rows={3}
                className="w-full bg-[#1a1a1a] border border-[#333] text-[#F5F0E8] text-xs rounded px-3 py-2 focus:border-[#E8A020] outline-none placeholder:text-[#555] resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-wider border ${
                  isPublic ? 'border-[#E8A020] text-[#E8A020] bg-[#E8A020]/10' : 'border-[#333] text-[#555]'
                }`}
              >
                {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {isPublic ? 'PUBLIC' : 'PRIVATE'}
              </button>
              <span className="text-[9px] text-[#555]">
                {isPublic ? 'Others can view this config' : 'Only you can see this'}
              </span>
            </div>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="w-full bg-[#E8A020] text-[#0D0D0D] hover:bg-[#d4911c] text-xs font-bold tracking-wider"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SAVE CONFIGURATION'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* My configs */}
            <div className="text-[10px] text-[#555] tracking-wider font-bold">MY CONFIGURATIONS</div>
            {configsQuery.isLoading && <Loader2 className="w-4 h-4 text-[#E8A020] animate-spin mx-auto" />}
            {configsQuery.data?.length === 0 && (
              <p className="text-[10px] text-[#555] text-center py-4">No saved configurations yet.</p>
            )}
            {configsQuery.data?.map((cfg: any) => (
              <div key={cfg.id} className="bg-[#141414] border border-[#222] rounded-lg p-2.5 hover:border-[#E8A020]/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#F5F0E8]">{cfg.title}</span>
                  <div className="flex items-center gap-1">
                    {cfg.isPublic === 1 && <Globe className="w-3 h-3 text-[#E8A020]" />}
                    <button
                      onClick={() => deleteMutation.mutate({ id: cfg.id })}
                      className="text-[#555] hover:text-[#C0392B]"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {cfg.description && <p className="text-[9px] text-[#555] mb-2">{cfg.description}</p>}
                <Button
                  size="sm"
                  onClick={() => handleLoad(cfg.data)}
                  className="w-full bg-[#1a1a1a] text-[#E8A020] hover:bg-[#222] text-[10px] font-bold tracking-wider border border-[#333]"
                >
                  LOAD
                </Button>
              </div>
            ))}

            {/* Public configs */}
            <div className="text-[10px] text-[#555] tracking-wider font-bold mt-4">SHARED BY COMMUNITY</div>
            {publicConfigsQuery.data?.map((cfg: any) => (
              <div key={cfg.id} className="bg-[#141414] border border-[#222] rounded-lg p-2.5">
                <div className="flex items-center gap-1 mb-1">
                  <Share2 className="w-3 h-3 text-[#E8A020]" />
                  <span className="text-xs font-bold text-[#F5F0E8]">{cfg.title}</span>
                </div>
                {cfg.description && <p className="text-[9px] text-[#555] mb-2">{cfg.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { create } from 'zustand';
import { Email, MailFolder, MailFilters, ComposeEmail } from '../models/mailModel';

interface MailState {
  // Data
  emails: Email[];
  selectedEmails: string[];
  selectedEmail: Email | null;
  currentFolder: MailFolder;
  filters: MailFilters;
  isComposeOpen: boolean;
  replyEmail: Email | null;

  // Loading states
  isLoading: boolean;
  isSending: boolean;

  // Actions
  setEmails: (emails: Email[]) => void;
  addEmail: (email: Email) => void;
  updateEmail: (id: string, updates: Partial<Email>) => void;
  deleteEmail: (id: string) => void;
  toggleEmailSelection: (id: string) => void;
  setCurrentFolder: (folder: MailFolder) => void;
  setFilters: (filters: Partial<MailFilters>) => void;
  openCompose: (replyTo?: Email) => void;
  openComposeForForward: () => void;
  closeCompose: () => void;
  setSelectedEmail: (email: Email | null) => void;
  clearSelectedEmail: () => void;
  sendEmail: (email: ComposeEmail) => Promise<void>;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  toggleStar: (id: string) => void;
  moveToFolder: (emailIds: string[], folder: MailFolder) => void;
  getUnreadCount: () => number;
}

export const useMailStore = create<MailState>((set, get) => ({
  // Initial state
  emails: [],
  selectedEmails: [],
  selectedEmail: null,
  currentFolder: 'inbox',
  filters: {
    folder: 'inbox',
    search: '',
    isUnreadOnly: false,
    isStarredOnly: false,
  },
  isComposeOpen: false,
  replyEmail: null,
  isLoading: false,
  isSending: false,

  // Actions
  setEmails: (emails) => set({ emails, selectedEmails: [] }),
  
  addEmail: (email) => set((state) => ({ 
    emails: [email, ...state.emails] 
  })),
  
  updateEmail: (id, updates) => set((state) => ({
    emails: state.emails.map(email => 
      email.id === id ? { ...email, ...updates } : email
    )
  })),
  
  deleteEmail: (id) => set((state) => ({
    emails: state.emails.filter(email => email.id !== id),
    selectedEmails: state.selectedEmails.filter(selectedId => selectedId !== id)
  })),
  
  toggleEmailSelection: (id) => set((state) => ({
    selectedEmails: state.selectedEmails.includes(id)
      ? state.selectedEmails.filter(selectedId => selectedId !== id)
      : [...state.selectedEmails, id]
  })),
  
  selectAllEmails: () => set((state) => ({
    selectedEmails: state.emails.map(email => email.id)
  })),
  
  deselectAllEmails: () => set({ selectedEmails: [] }),
  
  setCurrentFolder: (folder) => set((state) => ({
    currentFolder: folder,
    filters: { ...state.filters, folder }
  })),
  
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  
  openCompose: (replyTo) => set({
    isComposeOpen: true,
    replyEmail: replyTo || null
  }),

  openComposeForForward: () => set({
    isComposeOpen: true,
    replyEmail: null
  }),

  closeCompose: () => set({
    isComposeOpen: false,
    replyEmail: null
  }),

  setSelectedEmail: (email) => set({ selectedEmail: email }),

  clearSelectedEmail: () => set({ selectedEmail: null }),

  sendEmail: async (email) => {
    set({ isSending: true });
    try {
      // TODO: Implement API call to send email
      console.log('Sending email:', email);
      
      // Add to sent folder
      const sentEmail: Email = {
        id: Date.now().toString(),
        from: 'user@example.com', // TODO: Get from user profile
        to: email.to,
        subject: email.subject,
        body: email.body,
        folder: 'sent',
        isRead: true,
        isStarred: false,
        isImportant: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      get().addEmail(sentEmail);
      get().closeCompose();
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      set({ isSending: false });
    }
  },
  
  markAsRead: (id) => get().updateEmail(id, { isRead: true }),
  
  markAsUnread: (id) => get().updateEmail(id, { isRead: false }),
  
  toggleStar: (id) => set((state) => ({
    emails: state.emails.map(email => 
      email.id === id ? { ...email, isStarred: !email.isStarred } : email
    )
  })),
  
  moveToFolder: (emailIds, folder) => set((state) => ({
    emails: state.emails.map(email => 
      emailIds.includes(email.id) ? { ...email, folder } : email
    ),
    selectedEmails: []
  })),
  
  getUnreadCount: () => {
    const state = get();
    return state.emails.filter(email => 
      email.folder === 'inbox' && !email.isRead
    ).length;
  },
}));

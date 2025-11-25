import { Component, ChangeDetectionStrategy, output, inject, signal, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiChatService } from '../../services/gemini-chat.service';
import { ProfileService } from '../../services/profile.service';
import { ChatMessage } from '../../models/chat-message.model';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

@Component({
  selector: 'app-smart-assistant',
  templateUrl: './smart-assistant.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MarkdownPipe],
})
export class SmartAssistantComponent implements OnInit, AfterViewChecked {
  private geminiChatService = inject(GeminiChatService);
  private profileService = inject(ProfileService);

  closeModal = output<void>();

  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  userInput = signal('');
  isLoading = signal(false);
  
  private shouldScrollToBottom = false;

  ngOnInit() {
    const activeProfile = this.profileService.activeProfile();
    if (activeProfile) {
      this.geminiChatService.startChat(activeProfile.medications);
    }
    this.messages.set([
        {
            role: 'assistant',
            content: `Merhaba! Ben sizin Akıllı İlaç Asistanınızım. Mevcut ilaçlarınız hakkında ne öğrenmek istersiniz?
            \nÖrneğin, şunu sorabilirsiniz:
            \n* "Parol ne işe yarar?"
            \n* "İlaçlarımın olası yan etkileri nelerdir?"`
        }
    ]);
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  async sendMessage(prompt?: string) {
    const messageText = (prompt || this.userInput()).trim();
    if (!messageText || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    if (!prompt) {
        this.userInput.set('');
    }

    // Add user message
    this.messages.update(msgs => [...msgs, { role: 'user', content: messageText }]);
    this.shouldScrollToBottom = true;


    // Add initial assistant message for streaming
    this.messages.update(msgs => [...msgs, { role: 'assistant', content: '', isStreaming: true }]);
    
    try {
        const stream = this.geminiChatService.sendMessageStream(messageText);
        for await (const chunk of stream) {
            this.messages.update(msgs => {
                const lastMsg = msgs[msgs.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content += chunk;
                }
                return [...msgs];
            });
            this.shouldScrollToBottom = true;
        }
    } catch (error) {
        this.messages.update(msgs => {
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.content = 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.';
            }
            return [...msgs];
        });
    } finally {
        // Finalize assistant message
        this.messages.update(msgs => {
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg) {
                lastMsg.isStreaming = false;
            }
            return [...msgs];
        });
        this.isLoading.set(false);
        this.shouldScrollToBottom = true;
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch (err) { 
      console.error("Could not scroll to bottom:", err);
    }
  }
}

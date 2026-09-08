import os
import threading
import tkinter as tk
from tkinter import messagebox, scrolledtext, filedialog
import shutil
import subprocess
import sys

# Автоматично инсталиране и обновяване на yt-dlp
try:
    import yt_dlp
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "yt-dlp"])
    import yt_dlp

# Клас за насочване на прогреса от yt-dlp към конзолата на приложението
class YtDlpLogger:
    def __init__(self, log_callback):
        self.log_callback = log_callback

    def debug(self, msg):
        # yt-dlp подава прогреса (процентите) през debug метода
        if not msg.startswith('[debug] '):
            self.log_callback(msg)

    def info(self, msg):
        self.log_callback(msg)

    def warning(self, msg):
        self.log_callback(f"[ПРЕДУПРЕЖДЕНИЕ] {msg}")

    def error(self, msg):
        self.log_callback(f"[ГРЕШКА] {msg}")

class VideoDownloaderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Детство - Професионален видео сваляч")
        self.root.geometry("920x580")
        self.root.config(bg="#141414")

        self.download_path = os.getcwd()

        # Главен контейнер
        main_layout = tk.Frame(root, bg="#141414")
        main_layout.pack(fill="both", expand=True, padx=15, pady=15)

        # ЛЯВ ПАНЕЛ: Файлове в папката (в реално време)
        left_frame = tk.Frame(main_layout, bg="#1a1a1a", width=270, relief="flat")
        left_frame.pack(side="left", fill="y", padx=(0, 15))
        left_frame.pack_propagate(False)

        folder_title = tk.Label(
            left_frame, text="📁 Файлове в папката",
            fg="#ffffff", bg="#1a1a1a", font=("Arial", 11, "bold")
        )
        folder_title.pack(anchor="w", padx=10, pady=(10, 5))

        self.file_listbox = tk.Listbox(
            left_frame, bg="#111111", fg="#00ff66", font=("Consolas", 9),
            selectbackground="#e50914", relief="flat", highlightthickness=0
        )
        self.file_listbox.pack(fill="both", expand=True, padx=10, pady=10)

        # ДЯСЕН ПАНЕЛ: Управление
        right_frame = tk.Frame(main_layout, bg="#141414")
        right_frame.pack(side="right", fill="both", expand=True)

        title_label = tk.Label(
            right_frame, text="Сваляне в най-добро качество (MP4 + Звук)",
            fg="#e50914", bg="#141414", font=("Arial", 15, "bold")
        )
        title_label.pack(anchor="w", pady=(0, 10))

        # Избор на папка контролер
        folder_ctrl_frame = tk.Frame(right_frame, bg="#141414")
        folder_ctrl_frame.pack(fill="x", pady=5)

        self.path_entry = tk.Entry(
            folder_ctrl_frame, bg="#222222", fg="#00ff66", font=("Arial", 9),
            relief="flat"
        )
        self.path_entry.pack(side="left", fill="x", expand=True, ipady=4)
        self.path_entry.insert(0, self.download_path)
        self.path_entry.config(state="readonly")

        browse_btn = tk.Button(
            folder_ctrl_frame, text="Избери папка...", bg="#333333", fg="#ffffff",
            font=("Arial", 9, "bold"), relief="flat", cursor="hand2",
            command=self.select_folder
        )
        browse_btn.pack(side="right", padx=(8, 0), ipadx=5, ipady=2)

        # Поле за линк + бутон за изчистване
        url_label = tk.Label(
            right_frame, text="Линк за видео:",
            fg="#ffffff", bg="#141414", font=("Arial", 10)
        )
        url_label.pack(anchor="w", pady=(10, 2))

        url_container = tk.Frame(right_frame, bg="#141414")
        url_container.pack(fill="x", pady=2)

        self.url_entry = tk.Entry(
            url_container, bg="#222222", fg="#ffffff", insertbackground="white",
            font=("Arial", 11), relief="flat"
        )
        self.url_entry.pack(side="left", fill="x", expand=True, ipady=5)
        self.url_entry.focus_set()

        # Създаване на контекстно меню (десен бутон -> Постави)
        self.context_menu = tk.Menu(self.root, tearoff=0, bg="#222222", fg="#ffffff")
        self.context_menu.add_command(label="Постави (Paste)", command=self.paste_from_clipboard)
        self.context_menu.add_command(label="Изчисти", command=lambda: self.url_entry.delete(0, tk.END))

        # Завързване на клавишни комбинации и десен бутон за сигурен пейст
        self.url_entry.bind("<Control-v>", self.paste_shortcut)
        self.url_entry.bind("<Control-V>", self.paste_shortcut)
        self.url_entry.bind("<Button-3>", self.show_context_menu)

        clear_btn = tk.Button(
            url_container, text="✕", bg="#333333", fg="#ff4444",
            font=("Arial", 10, "bold"), relief="flat", cursor="hand2",
            command=lambda: self.url_entry.delete(0, tk.END)
        )
        clear_btn.pack(side="right", padx=(5, 0), ipadx=8, ipady=3)

        # Бутон за сваляне
        self.download_btn = tk.Button(
            right_frame, text="Свали видеото (MP4)", bg="#e50914", fg="#ffffff",
            font=("Arial", 11, "bold"), relief="flat", cursor="hand2",
            command=self.start_download_thread
        )
        self.download_btn.pack(fill="x", pady=12, ipady=5)

        # Конзола
        self.log_box = scrolledtext.ScrolledText(
            right_frame, bg="#0d0d0d", fg="#00ff66", font=("Consolas", 8),
            relief="flat", state="disabled", height=10
        )
        self.log_box.pack(fill="both", expand=True, pady=5)

        # Проверка за FFmpeg при стартиране
        if not shutil.which("ffmpeg"):
            self.log_message_safe("⚠️ ВНИМАНИЕ: FFmpeg не е намерен!")
            self.log_message_safe("За да се сглобяват файловете правилно и да не са 'счупени',")
            self.log_message_safe("изтегли ffmpeg.exe и го сложи в същата папка като този скрипт.")
            self.log_message_safe("-" * 65)

        # Стартираме фонов цикъл за непрекъснато следене на папката в реално време
        self.last_files_signature = ""
        self.poll_folder_realtime()

    def paste_from_clipboard(self):
        try:
            clipboard_text = self.root.clipboard_get()
            self.url_entry.insert(tk.INSERT, clipboard_text)
        except Exception:
            pass

    def paste_shortcut(self, event):
        self.paste_from_clipboard()
        return "break"

    def show_context_menu(self, event):
        try:
            self.context_menu.tk_popup(event.x_root, event.y_root)
        finally:
            self.context_Menu_release = True

    def select_folder(self):
        selected_dir = filedialog.askdirectory(initialdir=self.download_path)
        if selected_dir:
            self.download_path = selected_dir
            self.path_entry.config(state="normal")
            self.path_entry.delete(0, tk.END)
            self.path_entry.insert(0, self.download_path)
            self.path_entry.config(state="readonly")
            self.log_message_safe(f"[ПАПКА] Сменена папка: {self.download_path}")

    def poll_folder_realtime(self):
        try:
            if os.path.exists(self.download_path):
                files = os.listdir(self.download_path)
                valid_files = sorted([f for f in files if f.lower().endswith(('.mp4', '.mkv', '.webm', '.mp3', '.mov'))], reverse=True)
                
                signature = str(valid_files)
                if signature != self.last_files_signature:
                    self.last_files_signature = signature
                    self.file_listbox.delete(0, tk.END)
                    for file in valid_files:
                        self.file_listbox.insert(tk.END, f" • {file}")
        except Exception:
            pass
        
        self.root.after(1000, self.poll_folder_realtime)

    # Метод за безопасно писане в конзолата от нишката за сваляне
    def log_message_safe(self, message):
        self.root.after(0, self._log_message_internal, message)

    def _log_message_internal(self, message):
        self.log_box.config(state="normal")
        self.log_box.insert(tk.END, message + "\n")
        self.log_box.see(tk.END)
        self.log_box.config(state="disabled")

    def start_download_thread(self):
        raw_url = self.url_entry.get().strip()
        if not raw_url:
            messagebox.showerror("Грешка", "Моля, въведи валиден линк!")
            return
        
        self.download_btn.config(state="disabled", bg="#555555")
        self.log_message_safe(f"--- Стартиране за: {raw_url} ---")

        # Стартираме свалянето в отделна нишка, за да не забива програмата
        threading.Thread(target=self.download_video, args=(raw_url,), daemon=True).start()

    def download_video(self, url):
        output_template = os.path.join(self.download_path, '%(title)s.%(ext)s')

        ydl_opts = {
            'format': 'bestvideo+bestaudio/best',
            'merge_output_format': 'mp4',
            'outtmpl': output_template,
            'noplaylist': True,
            'logger': YtDlpLogger(self.log_message_safe), # Насочва логовете към UI
            
            # ЗАЩИТИ СРЕЩУ СЧУПЕНИ ФАЙЛОВЕ (HLS/M3U8 потоци)
            'hls_prefer_native': False,
            'prefer_ffmpeg': True,
            
            # ЗАЩИТИ СРЕЩУ 403 Forbidden / 404 Not Found от сайтовете
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'bg-BG,bg;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            'nocheckcertificate': True,
            'retries': 10,
            'fragment_retries': 10,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            self.log_message_safe(f"\n[УСПЕХ] Готово! Запазено в папка: {self.download_path}")
            self.root.after(0, lambda: messagebox.showinfo("Готово", "Свалянето приключи успешно!"))
        except Exception as e:
            self.log_message_safe(f"\n[ГРЕШКА]: {str(e)}")
            self.root.after(0, lambda: messagebox.showerror("Грешка", f"Възникна грешка:\n{e}"))
        finally:
            self.root.after(0, lambda: self.download_btn.config(state="normal", bg="#e50914"))

if __name__ == "__main__":
    root = tk.Tk()
    app = VideoDownloaderApp(root)
    root.mainloop()
export interface Message {
  rowid: string;
  guid: string;
  message_date: string;
  sender: string;
  text: string;
}

export interface ExtensionPreferences {
  lookBackDays?: string;
}

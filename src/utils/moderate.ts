export const bannedWords = [
    "cunt",
    "whore",
    "pussy",
    "slut",
    "tit",
    "cum",
    "blowjob",
    "bewbs",
    "boob",
    "booba",
    "boobies",
    "boobs",
    "booby",
    "pron",
    "r34",
    "mewing",
    "mew",
    "skibidi",
    "gyat",
    "gyatt",
    "rizzler",
    "nettspend",
    "boykisser",
    "rizz",
    "hawk tuah",
    "retard",
    "faggot",
    "fag",
    "faggots",
    "fags",
    "n*g",
    "n*gg*",
    "n*gg*r",
    "nigga",
    "nigger",
    "niglet"
];

export function checkForBannedWords(text: string): boolean {
    for (const word of bannedWords) {
        if (text.includes(word)) return false;
    }
    return true;
}

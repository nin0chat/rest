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
    // "wi.ng",
    "retard",
    "faggot",
    "fag",
    "faggots",
    "fags",
    "n.+g",
    "n.+gg.+",
    "n.+gg.+r",
    "nigga",
    "nigger",
    "niglet"
].map((word) => /* compile regexp on startup instead of every request */ new RegExp(word));

export function checkForBannedWords(text: string): boolean {
    for (const word of bannedWords) {
        if (word.test(text)) return false;
    }
    return true;
}

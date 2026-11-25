// The Roots & Echoes user manual — the single source for both the in-app
// Help page (/help) and its downloadable PDF, so the two can never drift
// apart. Written in a small, fixed subset of Markdown that
// src/lib/userManual.ts knows how to read:
//
//   ## 1. Title          a section (becomes a contents entry and an anchor)
//   **Bold line**        on its own line: a sub-heading inside a section
//   plain lines          a paragraph; **bold** inline is allowed
//   - item / 1. item     lists; indent a nested list by four spaces
//   | a | b |            a table (header row, divider row, then rows)
//
// Keep to that subset (no links, images, or backticks) when editing. The
// wording of buttons and labels (Add a photo, Record this memory, ...)
// is copied from the app itself — if a label changes in the app, change it
// here too.

export const USER_MANUAL_TITLE = "Roots & Echoes User Manual";
export const USER_MANUAL_SUBTITLE = "A guide for seniors and the family who help them";

export const USER_MANUAL_MARKDOWN = String.raw`
## 1. Welcome

Roots & Echoes is a private, easy-to-use place to keep a person's life story: their memories, family, photos, music, books, art and the milestones of their life. It grows a little each time someone uses it, so nothing has to be finished in one sitting.

This manual is for two people: the **senior**, whose story it is, and a **caregiver** (a son, daughter, grandchild, friend or helper) who may sit beside them or help from afar. Most of the steps are written so either person can follow them. Part 4 is about using the app together.

**How to read it**

- Seniors: start with Part 2, then try one section from Part 3. You can't break anything, and nothing is ever marked wrong.
- Caregivers: read Parts 2 to 5. Part 5 explains how a senior invites a helper and what a helper can do once invited.
- Anyone stuck: Part 7 lists the common problems and their fixes.

## 2. Getting started

There is nothing to install. Open the app in a web browser on a phone, tablet or computer, and sign in with an email address.

**Signing in**

1. Open the app's web address in your browser: rootsandechoes.app.
2. Type your email address and tap **Email me a sign-in link**.
3. Open the email. Tap the link, then tap the **Confirm sign-in** button on the page that opens. (That extra tap is deliberate: it stops email scanners from using up your link before you do.)
4. If the link doesn't work, type the code from the same email into the **Sign-in code** box instead.

There is no password to remember. Each sign-in sends a fresh link and code. If the email doesn't arrive in a few minutes, check the spam folder.

**The first time you sign in**

The app asks "This account is for…" and offers two choices. A senior chooses the one for their own story. A caregiver or family helper chooses the helper option and can add how they are related, for example "daughter". Then enter your name and you're in.

**Home**

Home is a set of large tiles, one for each part of the app: Story Time, Photos & Family, Music, Books, Art, Games, Let's Talk and the Life Story Book. Tap a tile to open it. (Let's Talk can be hidden by the account owner in Settings, and a helper who can only view does not see it.) The **Home** button at the top takes you back from anywhere.

**Making it easier to see and hear**

- **Text size:** the **A**, **A+** and **A++** buttons at the top make everything larger. Your choice is remembered on that device.
- **Read aloud:** anything with a **Read aloud** button, such as a question, a memory or song lyrics, is read out loud when you tap it. Tap **Stop reading** to stop. The voice can be changed in Settings (see Keepsakes and keeping track).
- **Put it on the home screen:** in your phone or tablet's browser menu, choose **Add to Home Screen** to get an icon that opens the app in one tap.

**Helping more than one person**

A caregiver who helps several people sees a screen asking whose story they are helping with today. Choose a person to work in their account. The **Switch** button at the top returns to that list.

## 3. The sections

Every section works the same way: a gentle prompt or an **Add** button, a box you can type in or talk into, and a **Save** button. Nothing needs to be filled in at once, and there are no scores or deadlines.

| Tile | What it is for | How to add something |
| --- | --- | --- |
| Story Time | Memories, told by typing or talking, with optional voice recordings | Answer a question, or start your own memory |
| Photos & Family | Photos, the people in them, and the family tree | **Add a photo**, **Add a person** |
| Music | Songs that matter, their lyrics, and why | **Add a song** |
| Books | Books that mattered, and why | **Add a book** |
| Art | Paintings, sculpture, photographs and other art that left an impression | Answer a prompt, or add a piece |
| Games | Four gentle memory games made from your own photos, songs and art | Nothing to add: they use what is already saved |
| Life Story Book | A timeline of the key milestones of a whole life | **Add a milestone** |
| Let's Talk | A friendly back-and-forth conversation with a guide, kept private until you choose to save it | Choose a mood and a guide, then answer |

**Let's Talk**

Let's Talk is a wide tile at the bottom of the tiles on Home. Choose what you are in the mood for (**Chat**, **Remember**, **Play** or **Think**), then choose a guide: **The Neighbor**, **The Biographer**, **The Curious Grandchild** or **The Music Companion**, or **Surprise me**. The guide asks one question. Answer by typing or tap **Speak instead** and say it aloud; some questions also have quick answer buttons. The guide replies, sometimes asks one follow-up, and then asks whether you would like **Another question** or to **Finish**. **Ask me something else** is always there if a question doesn't suit, and nothing is marked right or wrong. The guides are written ahead of time: they are not real people and not AI. Questions about photos show the photo, and questions about songs or people use the ones already saved.

A conversation stays private. Tap **Finish** to choose which answers to keep: tick the ones to save and give the memory a title, and they become a memory in Story Time. Or tap **Finish without saving**. An unfinished conversation waits on the Let's Talk page under **Pick up where you left off**. Finished ones are listed under **Recent conversations**: tap one to read it again, to tap **Save as a memory** if you have changed your mind, or to tap **Delete this conversation** (you are asked once more before it goes; a memory already saved from it stays). A helper with "can add" access can sit beside the senior and type; a view-only helper does not see the tile. In Settings, the account owner can hide Let's Talk from Home, turn individual guides off, and choose whether helpers may read full conversations (off unless switched on).

**Family Questions**

A helper with "can add" access can send the senior a question from far away. On the Let's Talk page the helper taps **Write a question**, types it or taps **Speak instead**, can add one of the senior's photos, and taps **Send**. The senior finds it under **Questions from family** at the top of Let's Talk, and the Let's Talk tile on Home shows how many are waiting. The senior opens a question, reads it (or taps **Read aloud**), and answers by speaking or typing, then taps **Send my answer**. **Not now** leaves the question in the list for later; **Skip this one** takes it off the list, and the helper is only shown that it was set aside, never a reason. After answering, the senior can tap **Save as a memory** to keep the question and answer in Story Time; until then the answer is shared only with the person who asked. When the answer arrives, the helper sees a note on their Home page, **Read the answer**, and an entry appears on the Activity page. The helper can take back a question they sent, and the senior can delete one. Nothing is sent by email or text. A view-only helper cannot send questions.

**Story Time**

A question appears, such as "What's a family tradition you remember from childhood?" Type an answer, or tap **Speak instead** and say it aloud. Tap **Surprise me** for a different question, or choose a topic such as childhood, family, work or travel. To record the real voice, tap **Record this memory**, or upload a recording you already have. Tap **Save this memory**. Open any saved memory later to read it, hear it, or add another recording.

Below the memories is **Life Story Recordings**: longer entries with a title, a short written summary of about 300 to 500 words, and one or more audio clips. A long conversation can be saved in parts, such as Part 1 and Part 2.

**Photos & Family**

This part of the app has two tabs across the top: **Photos** and **Family & friends**. Each shows how many it holds, for example "Photos (128)". Tap a tab to switch.

On the **Photos** tab, the newest photos come first, twelve at a time. Tap **Show 12 more** at the bottom to see older ones. Tap **Add a photo**, choose a picture from the device, give it a short title, and, if you like, a description, a date and who is in it (tick as many people as you like); the form folds away again once the photo is saved. Each photo shows its title, description and date. Tap **Edit details** under a photo to change any of the three. The date can be any wording you like, such as "1962", "Summer 1962" or "around 1960". To say who else is in a photo, tap **Tag people**, tick everyone who belongs, and tap **Add tags** once; the senior's own name appears in that list marked "(you)". People already tagged show as buttons under the photo, and tapping one removes that tag.

On the **Family & friends** tab, tap **Add a person** to add a family member or friend: their name, how they are related to the senior, whether they are living, and optionally their spouse and parents. The family tree builds itself from this. Tap **View family tree** to see it as a diagram. Each person in the list can be edited or deleted, and deleting a person never deletes the photos.

On the family tree you can also **tap anyone's circle** to change their details, exactly as in the list, and to delete them. After you save, a short sentence tells you what moved, for example "Anna now appears under Children." The senior can tap their own circle to change their own name. Someone who can only view cannot tap the circles. A person's own children and grandchildren are never offered as their parent.

**Music**

Tap **Add a song** and enter the title and artist. Lyrics can be typed, pasted, or loaded from a .txt, .docx or .pdf file. Add a note about what the song means, and optionally the recording itself or a YouTube link. The **Ask for a song** box plays a song from the saved library when you type or say its name. On a song's page you can also record yourself singing it.

**Books and Art**

Books: add the title, the author if known, and a few words on why the book mattered. Art: answer a prompt or add a piece with a title, artist, a picture, and why it stayed with you.

**Games**

Photo Jigsaw, Who's in the Photo?, Name That Song and Guess the Artwork. A game stays hidden until there is enough saved to play it. Nothing is timed, and a wrong guess is never shown as wrong: the game simply tells you the answer and moves on.

In **Who's in the Photo?**, any photo with someone tagged can come up, including photos you are in. If a photo has several people tagged, any one of them can be asked about, and a different one may come up next time. After you answer, the game names everyone in the photo and shows its date and description, if it has them.

**Life Story Book**

This is a timeline of key moments, not every memory: for example Born, a brother or sister born, started school, first job, married, a child born, a move, retired. Tap **Add a milestone**, choose the kind, and enter the year. The month and day are optional. A photo is optional too, and can be one already saved in Photos & Family. Add **Born** first, so the timeline can show how old the person was at each moment. A strip across the top shows the whole life by decade; tap a decade to jump to it.

## 4. Using it together: senior and caregiver

The best sessions are short and unhurried, with the senior doing the telling and the caregiver doing the tapping. The app is built for this: the senior can talk instead of type, and the caregiver can add the things that take fiddly work, such as scanning in photos or typing out names.

**Two ways to work together**

- **Side by side, on one screen.** Sit together with a tablet or laptop. The senior's account is open and either of you can use it. This is best for stories, music and games.
- **Apart, on your own devices.** The caregiver signs in with their own email, chooses the senior's name from the "whose story" list, and adds photos, people, songs and milestones whenever there is time. The senior will find them waiting. Anything a caregiver adds is labelled with the caregiver's name, so the senior always knows who added what.

A caregiver needs an invitation first. See Setting up a caregiver.

**Who does what**

| Activity | The senior | The caregiver |
| --- | --- | --- |
| Story Time | Answers by talking or typing; records a memory in their own voice | Reads the question aloud, taps **Record this memory** or **Save this memory**, and fixes the title afterwards |
| Photos & Family | Says who is in each photo and what was happening | Adds the photos, types names, adds people and tags them |
| Music | Asks for a song, sings or hums along, says what it means | Types titles and lyrics, uploads lyric files, adds YouTube links |
| Books and Art | Says why a book or picture mattered | Types the title and author, adds a picture of the artwork |
| Life Story Book | Recalls the moments and when they happened | Enters the milestones and attaches photos |
| Let's Talk | Answers a guide's questions by talking or typing, and chooses what to save | Sits beside them and types, or sends questions from afar with **Write a question** and reads the answers |
| Games | Plays | Sits alongside and enjoys it |

**A first session together, about 30 minutes**

1. **Get comfortable.** Open the app and tap **A+** or **A++** until the text is easy to read. Sit so you can both see the screen.
2. **Start with photos (5 minutes).** Open Photos & Family and look at a few pictures together, ideally ones you added beforehand. For each, ask "Who is this?" and tag them. Add a person if they aren't in the list yet.
3. **Tell one story (10 minutes).** Open Story Time. Tap **Read aloud**, or read the question aloud yourself. The senior answers in their own words. Use **Speak instead** to type what they say as they say it, or **Record this memory** to keep their voice. Tap **Save this memory**.
4. **Play a song (5 minutes).** Open Music. Use **Ask for a song** and listen together. Ask what it brings back, and add that as the note.
5. **Add one milestone (5 minutes).** Open Life Story Book. Add **Born** first, then one moment the senior chooses, such as a first job or a wedding.
6. **Finish with a game (5 minutes).** Open Games and play one round of Who's in the Photo? or Name That Song. Finishing on something fun leaves a good memory of the session.

These habits keep sessions happy:

- Follow the senior's lead. If a story wanders, let it, and save what they say.
- Don't correct. The app never marks anything wrong, and neither should you.
- Stop when they are tired. A few minutes a day is better than one long session.
- Fix spelling later, on your own. A name can always be corrected afterwards.
- Add a photo to a story. A face or a place often brings the next memory.

## 5. Setting up a caregiver

A caregiver can only see a senior's story after the senior invites them, and the senior can take that access away at any time. Only the senior's own login can invite or remove people. A caregiver cannot invite others or change anyone's access.

**To invite someone**

1. Signed in as the senior, scroll to the bottom of Home and tap **Account & family access settings**.
2. Under **Invite a family member**, type the helper's email address.
3. Choose what they may do, then tap **Invite**:
    - **Can add memories, photos & songs**: they can add and edit everything and download the keepsake PDFs.
    - **Can only view**: they can read, look and listen, but not add, change, delete or download anything.
4. Tell the person yourself. The app does not send an invitation email. Beside the invitation, tap **Copy message to send them**, then paste it into a text or an email. It explains the steps. The person must sign in using exactly the same email address you typed, and at their first sign-in choose **A family member helping someone else**. Their access switches on automatically the moment they do.

Until they sign in, the invitation is listed under the invite form, where it can be cancelled.

**Who has access**

The **People helping with your story** list in Settings shows everyone with access: their name, how they are related, their email address, and whether they can add or only view. Tap **Remove access** beside anyone to end it. They lose the senior's account straight away, and what they added stays in the story.

**What a helper can do**

| What | Can add | Can only view |
| --- | --- | --- |
| Read and listen to memories, photos, songs and the family tree | Yes | Yes |
| Add memories, photos, people, songs, books, art and milestones | Yes | No |
| Edit or delete a person (in the list or on the family tree), a photo or a milestone | Yes | No |
| Download the life story, family tree and photo PDFs | Yes | No |
| Run a Let's Talk conversation beside the senior, or send a Family Question | Yes | No |
| See the Let's Talk recap on the Activity page (never the words) | Yes | Yes |
| Read a full Let's Talk conversation another person ran | Only if the account owner allows it in Settings | Only if the account owner allows it in Settings |
| Change the voice or the Let's Talk settings, or invite and remove people | No | No |

**If the caregiver is setting things up for the senior**

A family member can create the senior's account on the senior's own device. Choose the senior option at the first sign-in, use the senior's own email address, and then invite yourself under your own email. After that you can each sign in separately.

## 6. Keepsakes and keeping track

**Printable keepsakes**

Three buttons turn what has been saved into a PDF to print, share or keep. They are visible only to the senior and to helpers who can add things.

| Button | Where it is | What you get |
| --- | --- | --- |
| **Download my life story** | Story Time | The memories in order by year, with their photos |
| **Download family tree** | Family Tree page, reached from Photos & Family | The tree as a diagram on one landscape page |
| **Download all photos** | Photos & Family | Every photo with its caption, date and the people in it |

The file is made on your own device, so a large collection of photos can take a moment. It then appears in your Downloads folder.

**The Activity page**

Tap **View activity** at the bottom of Home. It shows how many memories, photos, people, songs, books, art pieces, recordings and milestones have been added, when something was last added, a small chart of the last two weeks, and a list of every addition with who added it and when. A caregiver who lives far away can use it to see at a glance whether the app has been used lately. It records additions only, not edits or deletions. Below the chart, **Let's Talk** gives a short recap for the last two weeks: how many conversations, how many family questions were sent and answered, and each recent conversation with its guide, date, number of answers, topic and whether it was saved. It never shows what was said, unless the account owner has allowed helpers to read full conversations in Settings.

**Choosing the read-aloud voice**

In Settings, **Voice for read-aloud** lets the senior pick the voice used everywhere: **Default**, **Warm & Calm**, **Clear & Bright**, or a **Custom** voice made from an uploaded recording, which needs a tick to confirm you have permission to use that voice. Each choice has a **Hear a sample** button. Only the senior can change it, and the choice applies on every device.

## 7. Tips and troubleshooting

Most problems have a quick fix. Find yours below.

| Problem | What to try |
| --- | --- |
| The sign-in email doesn't arrive | Wait a few minutes and check the spam or junk folder. Make sure the address is typed correctly, then ask for a new link. |
| The link says it has expired or doesn't work | Use the newest email only. Tap **Confirm sign-in** on the page the link opens, or type the code from the email into the **Sign-in code** box instead. |
| An invited helper can't see the senior's story | They must sign in with exactly the email the senior typed in the invitation, and choose **A family member helping someone else** the first time. The app does not email the invitation, so the senior needs to tell them; Settings has a **Copy message to send them** button beside the invitation. |
| Let's Talk isn't on Home | The account owner may have hidden it in Settings (**Show Let's Talk on Home**), or the person signed in can only view. A helper who can add sees it when the owner has it switched on. |
| A family question doesn't show up for the senior | Questions appear under **Questions from family** at the top of the Let's Talk page, and as a count on the Let's Talk tile. Only a helper who can add can send one, and the senior needs to be signed in as themselves or with a helper beside them. A question the senior skipped no longer shows. |
| A helper can't add or change anything | They were invited as **Can only view**. The senior can remove them and invite them again as **Can add memories, photos & songs**. |
| A photo or recording won't upload | Check the internet connection and try again. Recordings can be up to 50 MB each; split a very long one into parts. |
| Song lyrics from a PDF come out empty | The PDF is probably a scan of a page, so it has no text in it. Type or paste the lyrics, or use a .txt or .docx file. |
| A person appears twice in the family tree | Usually the couple were filed under two different relationships, for example one as "Child" and the other as "Spouse". Edit one of them and set their relationship to "Other". |
| A person's initials in the tree look wrong | The initials follow the name, so correct the name and they update. Tap the circle on the tree (or **Edit** in the list). |
| A game won't open | It needs enough saved to play, such as at least two songs with lyrics for Name That Song. Add a few more and try again. |
| The text is too small | Tap **A+** or **A++** at the top of the page. |
| Read aloud is silent | Turn up the device volume and check it isn't on silent. The voice comes from the device itself. |

**A few reminders**

- Everything is private. Each senior's story is kept separate, and a helper sees it only after being invited.
- Nothing is ever marked wrong or scored, so there is no way to fail.
- Little and often works best. One memory a day builds a whole story in a few months.
- If you are still stuck, ask the family member who set up the account, and take a screenshot to show them what you see.
`;

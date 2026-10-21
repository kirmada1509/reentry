# ReEntry

## Brief product description

ReEntry helps people return to interrupted work without reconstructing everything from memory. It preserves the unfinished task, the materials needed to continue, and one concrete next action. When the user returns, it checks supported source material for changes and presents a calm, accessible recovery card showing what is complete, what changed, and where to continue.

## Detailed product description

### The person and the problem

ReEntry is designed first for students with ADHD, working-memory difficulties, or frequent interruptions. A student may leave an application, assignment, or research task because a class starts, a message arrives, or their available energy changes. Returning later involves more than reopening a tab: they must remember their intention, distinguish completed work from unfinished work, locate supporting materials, and establish whether the instructions still apply.

Existing task lists preserve obligations. Bookmarks preserve locations. ReEntry preserves the relationship between an unfinished intention and the current state of the work.

Its central promise is simple: the user should be able to take the next correct action without rereading an entire history.

### The product experience

A user begins with a supported task, such as completing a scholarship application. ReEntry associates the application with its instructions, attachments, relevant references, and the user's stated goal. It records confirmed progress and allows the user to correct the saved state.

When the user pauses, ReEntry creates a compact recovery card. On return, the card answers four questions:

- What have I already completed?
- What material do I need in front of me?
- Has anything relevant changed?
- What is the next concrete action?

The next action is specific enough to execute: for example, “Open the referee section and add your teacher's email,” rather than “Continue the application.”

For supported sources, ReEntry compares the saved information with the current information. If a requirement or deadline has changed, it explains the difference and identifies the source. If it cannot establish whether a source is current, it presents that uncertainty instead of treating an old instruction as reliable.

The user controls whether to resume, revise the task state, or resolve an unanswered question. ReEntry distinguishes user-confirmed progress from information inferred by AI.

### Core capabilities

**Task recovery packets.** Each unfinished task has a compact packet containing its goal, confirmed progress, relevant materials, open questions, and next action.

**Changed-source checks.** Relevant changes in supported instructions are surfaced before the user follows an outdated step. Checks display the source and the time of the comparison.

**Concrete continuation.** The primary interaction takes the user to the material and place needed for the next action, wherever the supported workflow permits.

**Correction and recovery.** Users can correct an inaccurate checkpoint, revisit the original evidence, and recover the previous saved state.

**Accessible presentation.** Logical reading order, descriptive controls, visible focus, keyboard navigation, large text support, and screen-reader announcements are part of the core experience. Meaning does not depend on color, animation, or a countdown.

**Private working context.** The intended local-inference version keeps task interpretation on the user's device. Any optional external processing must be clearly identified before material is sent.

### A representative user journey

A student has attached a transcript but has not completed the referee section of an application. They pause to attend class. During the break, the application instructions change from one referee to two.

When the student returns, ReEntry shows the completed attachment, highlights the changed referee requirement, links to the current instruction, and offers one action: complete the first referee entry. The second entry remains visible as subsequent work without overwhelming the current step.

### Demo revelation

The demonstration follows one application through an interruption. A visible instruction changes during the pause. On return, ReEntry restores the correct materials and identifies the change before offering the next action. A keyboard and screen-reader walkthrough shows that the same recovery information is available without relying on the visual layout.

The meaningful result is a correct continuation, with fewer repeated or missed steps.

### Differentiation and evidence

Task bookmarks and context recall are established categories. Open ADHD provides task bookmarks, and Microsoft Recall helps people retrieve previous activity. ReEntry's proposed contribution is the combination of task-specific recovery, explicit progress evidence, and a check that the saved intention remains valid.

That distinction is a product hypothesis. Validation should observe whether users reach their next correct action more quickly and make fewer repeated or omitted steps. Small pilots should report individual observations and sample size rather than imply broad clinical benefits.

### Hackathon alignment

- **Task Forge:** the central behavior addresses an accessible productivity barrier for a specific user.
- **Build With AI: Basics:** the product offers a complete, understandable experience. Eligibility requires using the prescribed Learn Skill Pack from the beginning and preserving its planning documents.
- **Hacktoberfest Week 3:** an open-weight model performing substantive task interpretation can support the open-source AI and reduced-effort theme. The write-up should explain the role of local inference and show a real design improvement.

Cross-event submission permission has not been confirmed. These are proposed fits, not confirmed multi-event eligibility.

### Reference links

- [Task Forge](https://taskforge.devpost.com/)
- [Build With AI: Basics](https://learn-ai-basics.devpost.com/)
- [Hacktoberfest Week 3](https://dev.to/challenges/hacktoberfest-week3-2026-10-19)
- [Open ADHD task bookmarks](https://open-adhd.org/resume-task/)
- [Microsoft Recall](https://support.microsoft.com/en-us/windows/ai/ai-features/retrace-your-steps-with-recall)
- [SnipStash: relevant product inspiration](https://apps.shipaton.com/app/snipstash-snippet-manager)

Product concept prepared October 21, 2026. Described capabilities are proposed behavior, not claims of completed implementation or measured results.

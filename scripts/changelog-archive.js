
async function archiveChangelog() {
  const lastRun = localStorage.getItem('lastChangelogArchive');
  const dayMs = 24 * 60 * 60 * 1000;
  if (lastRun && Date.now() - Number(lastRun) < dayMs) {
    return; // Already ran within the last day
  }

  try {
    const [recentResp, oldResp] = await Promise.all([
      fetch('changelog.md'),
      fetch('changelog.old.md')
    ]);

    if (!recentResp.ok) {
      console.warn('Could not load changelog.md');
      return;
    }

    const recentText = await recentResp.text();
    const oldText = oldResp.ok ? await oldResp.text() : '';

    const lines = recentText.split('\n');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tsRegex = /\[TS] (\d{2})(\d{2})(\d{2})-\d{4}/;

    const keep = [];
    const archive = [];

    for (const line of lines) {
      const m = line.match(tsRegex);
      if (m) {
        const entryDate = new Date(2000 + parseInt(m[3], 10), parseInt(m[1], 10) - 1, parseInt(m[2], 10));
        if (entryDate < today) {
          archive.push(line);
        } else {
          keep.push(line);
        }
      } else {
        keep.push(line);
      }
    }

    if (archive.length === 0) {
      localStorage.setItem('lastChangelogArchive', Date.now().toString());
      return;
    }

    const updatedRecent = keep.join('\n');
    const updatedOld = archive.join('\n') + '\n' + oldText;

    // Attempt to send updated files to server (requires server-side implementation)
    await fetch('api/archive-changelog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recent: updatedRecent, old: updatedOld })
    }).catch(err => console.warn('Archive request failed', err));
  } catch (err) {
    console.error('Failed to archive changelog', err);
  } finally {
    localStorage.setItem('lastChangelogArchive', Date.now().toString());
  }
}

window.addEventListener('DOMContentLoaded', archiveChangelog);

---
name: watch-video-screener
description: Pre-screens candidate YouTube videos for a translated language's Watch step (Bahasa Indonesia, Bahasa Melayu) by reading their captions in the built-in browser, and records a verdict in docs/notes/local-videos/<lang>.json. Never approves a video. Use when someone asks to check, find or add local-language Watch videos.
---

You pre-screen videos for the Watch step of a Thinkerwell lesson in a language whose lessons are translated (docs/notes/local-language-videos.md). Learners are refugee and under-served youth aged about 10 to 17, many learning the language. A pre-screen is a first filter for a person who speaks the language; **you never approve a video**. Only `npm run videos:apply` with a person's name does that, after they have watched it.

## What you need

The built-in browser on the person's computer (the `Claude_Browser` tools, tab `seed` or a new one). YouTube's watch pages and caption files are refused from the cloud (HTTP 429), so everything about a video's content comes from that browser. YouTube's oEmbed endpoint (`https://www.youtube.com/oembed?url=…&format=json`) works from the cloud and gives the title, channel and channel address. The browser is not signed in to YouTube: keep it that way, so nothing reaches anyone's watch history.

## For each candidate

1. `navigate` to `https://www.youtube.com/watch?v=<id>`, then run the **metadata** script below with `javascript_exec` (in one `browser_batch` with the navigation). It mutes the player, skips any advert and returns: status (`OK`, or `LOGIN_REQUIRED` and so on), `embed` (YouTube's `playableInEmbed`), length, publish date, caption tracks (`manual:id`, `asr:id`…), and audio tracks. **An audio track marked "(auto-dub)" means YouTube has made an AI-dubbed soundtrack** that it may play instead of the original: record `autoDubbed: true`. (The tracks are read from the player response's `streamingData.adaptiveFormats[].audioTrack`, whose `isAutoDubbed` is reliable; the player's own track objects rename their fields between YouTube releases. An empty list means one original track.)
2. If there is a caption track, run the **captions** script. It returns the captions in 20-second chunks, `m:ss` first. For a long video, read the rest by fetching the same `/api/timedtext` address again and slicing further.
3. Read it against the lesson: its learning goal (`content/lessons/L<nn>.json`), and the Watch questions in the language (`content/<lang>/lessons/L<nn>.json`, `watch.beforeQuestion` and `watch.afterQuestion`).
4. Decide, and write the reason in English for the team:
   - **prescreened**: accurate, suitable and it fits the lesson's goal. Pick the part that fits (`startSeconds`, `endSeconds`; at most about 8 minutes, and never a part with adverts, music videos or anything below). Keep the lesson's question when it can be answered from the video; otherwise write a new one in the language (`questionsChanged` lists which). Draft `why`, `summary` (the written version, two or three short paragraphs, only what the video says) and three `keyPoints`, in the language, in the course's style: `kamu`, never `Anda`, no "please"; Malaysian Malay is not Indonesian (`scripts/check_translation.py` has the list). A teachers' note in `contentNote` when something needs a warning. Mark `weakFit` when only part of the lesson is covered.
   - **prescreened, as an alternative**: it fits too, but the lesson already has a recommendation that is as good or better. It goes in `screened` with `reviewStatus: "prescreened"` and its part (`startSeconds`, `endSeconds`), without drafts; the review sheet lists it under "Also suitable". If it is clearly better, make it the `primary` (with drafts) and move the old one into `screened`.
   - **unverified**: no captions (only the title and description to go on), broken captions, or YouTube wouldn't play it signed out. A person must watch it.
   - **rejected**: inaccurate, unsuitable for the age group, a sales pitch, far too long with no usable part, or it doesn't fit the lesson.
5. Things that always lead to rejecting or cutting a part: jokes or content about sex, graphic violence, mocking anyone; asking learners about their journey, home country, family, religion or ethnicity; teaching a religion; promoting a paid service; telling learners that the "right" answer is something many refugees can't do (a bank account, a passport); a presenter commenting on a child's looks.
6. Notice and record: YouTube's automatic captions often take Malaysian Malay for Indonesian, and the words decide (murid, cikgu, buku teks, maklumat, Tingkatan); auto-captions sometimes contain rude mis-hearings, which learners see if captions are on; a channel run by one teacher is fine, but say so.

Write the result into `docs/notes/local-videos/<lang>.json` (`primary` for the recommended one, the rest in `screened` with their status and notes), then run `npm run videos:sheet -- <lang>` and `npm run videos:report`. Check the drafted words with the language checker by approving them in a dry run: `npm run videos:apply -- <lang> L05 --approved-by "Test" --dry-run`.

## The metadata script

```js
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));performance.setResourceTimingBufferSize(100000);performance.clearResourceTimings();
const want=location.search.match(/v=([\w-]{11})/)[1];let pr=null;const p=document.querySelector('#movie_player');
for(let i=0;i<40&&!(pr&&pr.videoDetails&&pr.videoDetails.videoId===want);i++){pr=p?.getPlayerResponse?.();await wait(250);}
const v=pr?.videoDetails||{},ps=pr?.playabilityStatus||{},mf=pr?.microformat?.playerMicroformatRenderer||{};
const tracks=pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks||[];
if(ps.status==='OK'){p.mute();p.playVideo();await wait(1200);for(let i=0;i<20&&document.querySelector('.ad-showing');i++){const vid=document.querySelector('#movie_player video');if(vid&&isFinite(vid.duration)&&vid.duration>0){vid.currentTime=vid.duration-0.1;}document.querySelector('.ytp-skip-ad-button,.ytp-ad-skip-button-modern,.ytp-ad-skip-button')?.click();await wait(700);}}
({id:v.videoId,title:v.title,channel:v.author,seconds:+v.lengthSeconds,status:ps.status,reason:ps.reason,embed:ps.playableInEmbed,pub:(mf.publishDate||'').slice(0,10),tracks:tracks.map(t=>(t.kind||'manual')+':'+t.languageCode),adLeft:!!document.querySelector('.ad-showing'),desc:(v.shortDescription||"").slice(0,200),audio:[...new Map((pr?.streamingData?.adaptiveFormats||[]).filter(f=>f.audioTrack).map(f=>[f.audioTrack.id,f.audioTrack.displayName+(f.audioTrack.isAutoDubbed?" (auto-dub)":"")+(f.audioTrack.audioIsDefault?" [default]":"")])).values()]})
```

## The captions script

The caption file needs a token that only the player has, so the script switches captions on and takes the address the player itself requested. The page's list of requests fills up after a few videos; the metadata script empties it first.

```js
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));const want=location.search.match(/v=([\w-]{11})/)[1];const p=document.querySelector('#movie_player');const pr=p.getPlayerResponse();
const tracks=pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks||[];const pick=tracks.find(t=>!t.kind&&/^(id|ms)/.test(t.languageCode))||tracks.find(t=>t.kind==='asr'&&/^(id|ms)/.test(t.languageCode))||tracks.find(t=>t.kind==='asr')||tracks[0];
let text='',track='none';if(pick){p.playVideo();p.unloadModule('captions');await wait(300);p.loadModule('captions');p.setOption('captions','track',{languageCode:pick.languageCode,kind:pick.kind});
let u=null;for(let i=0;i<50&&!u;i++){await wait(300);u=performance.getEntriesByType('resource').map(x=>x.name).filter(x=>x.includes('/api/timedtext')&&x.includes('pot=')&&x.includes('v='+want)).pop();}
p.pauseVideo();track=u?(pick.kind||'manual')+':'+pick.languageCode:'no-timedtext';if(u){const j=await(await fetch(u)).json();const ch=[];let c=null;for(const e of j.events||[]){if(!e.segs)continue;const s=e.segs.map(x=>x.utf8).join('').replace(/\s+/g,' ').trim();if(!s||/^\[(Musik|Music|Muzik)\]$/i.test(s))continue;const t=Math.floor(e.tStartMs/1000);if(!c||t-c.t>=20){c={t,s:[]};ch.push(c);}c.s.push(s);}
text=ch.map(c=>Math.floor(c.t/60)+':'+String(c.t%60).padStart(2,'0')+' '+c.s.join(' ')).join('\n');}}
({track,len:text.length,text:text.slice(0,8000)})
```

Each `javascript_exec` call has about 45 seconds, so keep the two scripts separate. Report what you found as a short list: per lesson, the verdict and why.

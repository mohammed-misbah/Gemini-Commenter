let activeEditor = null;
let generating = false;

/* Detect LinkedIn comment editor */

document.addEventListener("focusin", function (e) {
  if (
    e.target &&
    e.target.getAttribute &&
    e.target.getAttribute("contenteditable") === "true"
  ) {
    activeEditor = e.target;
    attachAIButton(e.target);
  }
});

/* Extract post text */

function extractPostText(post) {

  const description = post.querySelector(".feed-shared-update-v2__description");
  const fallback = post.querySelector(".update-components-text");

  let text = "";

  if (description) text = description.innerText;
  else if (fallback) text = fallback.innerText;
  else text = post.innerText;

  return text
    .replace(/\s+/g, " ")
    .replace(/Like.*?Reply/g, "")
    .substring(0, 600)
    .trim();
}


/* Remove LinkedIn mention nodes */

function removeMentions(editor){
  const mentions = editor.querySelectorAll(
    ".mentions-texteditor__mention,[data-mention]"
  );
  mentions.forEach(node => node.remove());
}


/* HARD RESET EDITOR */

function resetEditor(editor){

  editor.focus();
  removeMentions(editor);

  while(editor.firstChild){
    editor.removeChild(editor.firstChild);
  }

  const p = document.createElement("p");
  p.appendChild(document.createElement("br"));
  editor.appendChild(p);
}


/* Insert generated comment */

function insertComment(editor,text){

  editor.focus();

  if(text.length>900){
    text=text.substring(0,900);
  }

  resetEditor(editor);

  const newParagraph = document.createElement("p");
  newParagraph.textContent = text;

  while(editor.firstChild){
    editor.removeChild(editor.firstChild);
  }

  editor.appendChild(newParagraph);

  editor.dispatchEvent(new InputEvent("input",{bubbles:true}));
  editor.dispatchEvent(new Event("change",{bubbles:true}));
}


/* Attach AI button */

function attachAIButton(editor){

  if(editor.parentElement.querySelector(".local-ai-container")) return;

  const wrapper=document.createElement("div");
  wrapper.className="local-ai-container";

  wrapper.style.cssText=`
  position:relative;
  display:flex;
  align-items:center;
  margin-left:6px;
  `;


  /* AI LOGO BUTTON */

  const toggleBtn=document.createElement("img");

  toggleBtn.src = chrome.runtime.getURL("ai-logo.png");

  toggleBtn.style.cssText=`
  width:26px;
  height:26px;
  cursor:pointer;
  border-radius:50%;
  object-fit:cover;
  `;


  /* PANEL */

  const container=document.createElement("div");

  container.style.cssText=`
  position:absolute;
  bottom:0;
  right:100%;
  margin-right:10px;
  padding:14px;
  border-radius:12px;
  background:#ffffff;
  box-shadow:0 10px 24px rgba(0,0,0,0.15);
  border:1px solid #e6e6e6;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  display:none;
  flex-direction:column;
  gap:12px;
  width:260px;
  z-index:9999;
  `;


  const title=document.createElement("div");
  title.textContent="AI Comment Generator";

  title.style.cssText=`
  font-size:13px;
  font-weight:600;
  color:#333;
  `;

  container.appendChild(title);


  const modesWrapper=document.createElement("div");

  modesWrapper.style.cssText=`
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  `;


  const modes=[
    { value:"professional", label:"💼 Professional" },
    { value:"friendly", label:"😊 Friendly" },
    { value:"question", label:"❓ Question" },
    { value:"funny", label:"😂 Funny" },
    { value:"one-liner", label:"⚡ One-liner" }
  ];


  let selectedTone="professional";


  modes.forEach(mode=>{

    const chip=document.createElement("button");

    chip.textContent=mode.label;

    chip.style.cssText=`
    padding:6px 10px;
    border-radius:18px;
    border:1px solid #d0d0d0;
    background:#f5f5f5;
    cursor:pointer;
    font-size:11px;
    `;


    if(mode.value===selectedTone){
      chip.style.background="#0a66c2";
      chip.style.color="#fff";
    }


    chip.onclick=()=>{

      selectedTone=mode.value;

      modesWrapper.querySelectorAll("button").forEach(btn=>{
        btn.style.background="#f5f5f5";
        btn.style.color="#000";
      });

      chip.style.background="#0a66c2";
      chip.style.color="#fff";

    };

    modesWrapper.appendChild(chip);

  });


  container.appendChild(modesWrapper);


  const generateBtn=document.createElement("button");

  generateBtn.textContent="Generate Comment";

  generateBtn.style.cssText=`
  padding:10px;
  border-radius:8px;
  border:none;
  background:linear-gradient(135deg,#0a66c2,#004182);
  color:#ffffff;
  font-weight:600;
  cursor:pointer;
  font-size:12px;
  `;


  container.appendChild(generateBtn);


  toggleBtn.onclick=()=>{
    container.style.display=
    container.style.display==="none"?"flex":"none";
  };


  generateBtn.onclick=async function(){

    if(generating) return;

    generating = true;

    generateBtn.textContent = "Generating...";
    generateBtn.disabled = true;

    container.style.display="none";

    const post=editor.closest(".feed-shared-update-v2");

    const postText=extractPostText(post);

    const tone=selectedTone;

    let prompt="";


    if(tone==="professional"){
prompt = `You are an experienced LinkedIn thought leader.

Write a thoughtful professional comment reacting to this post.

Rules:
- Do not repeat the post
- Add perspective
- 2–4 sentences
- Sound human and confident

Post:
${postText}

Return only the final comment.`;
    }


    if(tone==="friendly"){
prompt = `You are a friendly LinkedIn user.

Write a warm supportive comment.

Rules:
- Natural tone
- 2–3 sentences
- Add positive insight

Post:
${postText}

Return only the comment.`;
    }


    if(tone==="question"){
prompt = `You are a LinkedIn engagement strategist.

Write a response that ends with a thoughtful question.

Rules:
- Add perspective
- 2–3 sentences
- Question must feel natural

Post:
${postText}

Return only the comment.`;
    }


    if(tone==="funny"){
prompt = `You are a witty LinkedIn commenter.

Write a clever humorous response.

Rules:
- Business appropriate humor
- 2–3 sentences
- Not childish

Post:
${postText}

Return only the comment.`;
    }


    if(tone==="one-liner"){
prompt = `Write one short insightful LinkedIn comment reacting to the post.

Rules:
- One or two sentences
- Thought-provoking
- Natural tone

Post:
${postText}

Return only the comment.`;
    }


    chrome.runtime.sendMessage(
      {type:"generate",prompt:prompt},
      function(response){

        generating = false;

        generateBtn.textContent = "Generate Comment";
        generateBtn.disabled = false;

        if(!response || !response.success){
          alert("Generation error.");
          return;
        }

        let generatedText=(response.text||"").trim();

        if(!generatedText){
          alert("Empty response.");
          return;
        }

        insertComment(editor,generatedText);

      }
    );

  };


  wrapper.appendChild(toggleBtn);
  wrapper.appendChild(container);

  editor.parentElement.appendChild(wrapper);

}

















































































































































































































// let activeEditor = null;
// let generating = false; // RATE LIMIT LOCK

// document.addEventListener("focusin", function (e) {
//   if (
//     e.target &&
//     e.target.getAttribute &&
//     e.target.getAttribute("contenteditable") === "true"
//   ) {
//     activeEditor = e.target;
//     attachAIButton(e.target);
//   }
// });

// /* Extract post text */

// function extractPostText(post) {

//   const description = post.querySelector(".feed-shared-update-v2__description");
//   const fallback = post.querySelector(".update-components-text");

//   let text = "";

//   if (description) text = description.innerText;
//   else if (fallback) text = fallback.innerText;
//   else text = post.innerText;

//   return text
//     .replace(/\s+/g, " ")
//     .replace(/Like.*?Reply/g, "")
//     .substring(0, 600)
//     .trim();
// }


// /* HARD RESET EDITOR (REMOVES LINKEDIN MENTION NODE) */

// function resetEditor(editor){

//   editor.innerHTML = "";

//   const p = document.createElement("p");
//   p.innerHTML = "<br>";

//   editor.appendChild(p);

// }


// /* Insert generated comment */

// function insertComment(editor,text){

//   editor.focus();

//   if(text.length>900){
//     text=text.substring(0,900);
//   }

//   resetEditor(editor);

//   const p = editor.querySelector("p");

//   if(p){
//     p.textContent = text;
//   }else{
//     editor.textContent = text;
//   }

//   editor.dispatchEvent(new Event("input",{bubbles:true}));

// }


// /* Attach AI button */

// function attachAIButton(editor){

//   if(editor.parentElement.querySelector(".local-ai-container")) return;

//   const wrapper=document.createElement("div");
//   wrapper.className="local-ai-container";

//   wrapper.style.cssText=`
//   position:relative;
//   display:flex;
//   align-items:center;
//   margin-left:6px;
//   `;


//   const toggleBtn=document.createElement("div");

//   toggleBtn.textContent="✨";

//   toggleBtn.style.cssText=`
//   width:34px;
//   height:34px;
//   border-radius:50%;
//   background:linear-gradient(135deg,#0a66c2,#004182);
//   color:white;
//   display:flex;
//   align-items:center;
//   justify-content:center;
//   cursor:pointer;
//   flex-shrink:0;
//   `;


//   const container=document.createElement("div");

//   container.style.cssText=`
//   position:absolute;
//   bottom:0;
//   right:100%;
//   margin-right:10px;
//   padding:14px;
//   border-radius:12px;
//   background:#ffffff;
//   box-shadow:0 10px 24px rgba(0,0,0,0.15);
//   border:1px solid #e6e6e6;
//   font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
//   display:none;
//   flex-direction:column;
//   gap:12px;
//   width:260px;
//   z-index:9999;
//   `;


//   const title=document.createElement("div");
//   title.textContent="AI Comment Generator";

//   title.style.cssText=`
//   font-size:13px;
//   font-weight:600;
//   color:#333;
//   `;

//   container.appendChild(title);


//   const modesWrapper=document.createElement("div");

//   modesWrapper.style.cssText=`
//   display:flex;
//   flex-wrap:wrap;
//   gap:6px;
//   `;


//   const modes=[
//     { value:"professional", label:"💼 Professional" },
//     { value:"friendly", label:"😊 Friendly" },
//     { value:"question", label:"❓ Question" },
//     { value:"funny", label:"😂 Funny" },
//     { value:"one-liner", label:"⚡ One-liner" }
//   ];


//   let selectedTone="professional";


//   modes.forEach(mode=>{

//     const chip=document.createElement("button");

//     chip.textContent=mode.label;

//     chip.style.cssText=`
//     padding:6px 10px;
//     border-radius:18px;
//     border:1px solid #d0d0d0;
//     background:#f5f5f5;
//     cursor:pointer;
//     font-size:11px;
//     `;


//     if(mode.value===selectedTone){
//       chip.style.background="#0a66c2";
//       chip.style.color="#fff";
//     }


//     chip.onclick=()=>{

//       selectedTone=mode.value;

//       modesWrapper.querySelectorAll("button").forEach(btn=>{
//         btn.style.background="#f5f5f5";
//         btn.style.color="#000";
//       });

//       chip.style.background="#0a66c2";
//       chip.style.color="#fff";

//     };

//     modesWrapper.appendChild(chip);

//   });


//   container.appendChild(modesWrapper);


//   const generateBtn=document.createElement("button");

//   generateBtn.textContent="Generate Comment";

//   generateBtn.style.cssText=`
//   padding:10px;
//   border-radius:8px;
//   border:none;
//   background:linear-gradient(135deg,#0a66c2,#004182);
//   color:#ffffff;
//   font-weight:600;
//   cursor:pointer;
//   font-size:12px;
//   `;


//   container.appendChild(generateBtn);


//   toggleBtn.onclick=()=>{
//     container.style.display=
//     container.style.display==="none"?"flex":"none";
//   };


//   generateBtn.onclick=async function(){

//     if(generating) return; // PREVENT SPAM

//     generating = true;

//     generateBtn.textContent = "Generating...";
//     generateBtn.disabled = true;

//     container.style.display="none";

//     const post=editor.closest(".feed-shared-update-v2");

//     const postText=extractPostText(post);

//     const tone=selectedTone;

//     let prompt="";


//     if(tone==="professional"){
// prompt = `You are an experienced LinkedIn thought leader.

// Write a thoughtful professional comment reacting to this post.

// Rules:
// - Do not repeat the post
// - Add perspective
// - 2–4 sentences
// - Sound human and confident

// Post:
// ${postText}

// Return only the final comment.`;
//     }


//     if(tone==="friendly"){
// prompt = `You are a friendly LinkedIn user.

// Write a warm supportive comment.

// Rules:
// - Natural tone
// - 2–3 sentences
// - Add positive insight

// Post:
// ${postText}

// Return only the comment.`;
//     }


//     if(tone==="question"){
// prompt = `You are a LinkedIn engagement strategist.

// Write a response that ends with a thoughtful question.

// Rules:
// - Add perspective
// - 2–3 sentences
// - Question must feel natural

// Post:
// ${postText}

// Return only the comment.`;
//     }


//     if(tone==="funny"){
// prompt = `You are a witty LinkedIn commenter.

// Write a clever humorous response.

// Rules:
// - Business appropriate humor
// - 2–3 sentences
// - Not childish

// Post:
// ${postText}

// Return only the comment.`;
//     }


//     if(tone==="one-liner"){
// prompt = `Write one short insightful LinkedIn comment reacting to the post.

// Rules:
// - One or two sentences
// - Thought-provoking
// - Natural tone

// Post:
// ${postText}

// Return only the comment.`;
//     }


//     chrome.runtime.sendMessage(
//       {type:"generate",prompt:prompt},
//       function(response){

//         generating = false;

//         generateBtn.textContent = "Generate Comment";
//         generateBtn.disabled = false;

//         if(!response || !response.success){
//           alert("Generation error.");
//           return;
//         }

//         let generatedText=(response.text||"").trim();

//         if(!generatedText){
//           alert("Empty response.");
//           return;
//         }

//         insertComment(editor,generatedText);

//       }
//     );

//   };


//   wrapper.appendChild(toggleBtn);
//   wrapper.appendChild(container);

//   editor.parentElement.appendChild(wrapper);

// }



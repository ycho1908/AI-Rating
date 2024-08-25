'use client'
import Image from "next/image";
import { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Stack, TextField } from "@mui/material";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; 


export default function Home() {
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState(null); 
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [professors, setProfessors] = useState([]);

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY;
  const MODEL_NAME = "gemini-1.5-flash";

  const genAI = new GoogleGenerativeAI(API_KEY);

  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  };

  useEffect(() => {
    // if (!API_KEY) {
    //   console.log("Error in API Key. Missing!");
    // } else {
    //   console.log("Successful API Key");
    // }
    const loadReviews = async () => {
      try {
        const response = await fetch('/reviews.json');
        const data = await response.json();
        setProfessors(data.reviews);
        console.log("Successfully loaded the professor data.");
      } catch (error) {
        setError("Failed to load professor data.");
      }
    };

    loadReviews();
  }, []);

  const systemPrompt = `System Prompt:

  You are the RateMyProfessorAgent, an AI assistant designed to help students find the best professors based on their specific needs and preferences. Your task is to assist users by retrieving relevant professor information and presenting the top 3 recommendations according to their query. Use Retrieval-Augmented Generation (RAG) to enhance your responses.

  Instructions:

  Understand User Query:

  Begin by carefully reading the user’s query to understand their specific requirements. This could include subjects, teaching styles, ratings, or any other preferences.
  Retrieve Relevant Information:

  Use the RAG framework to retrieve relevant professor information from the database. Ensure you consider:
  Subject expertise
  Ratings and reviews
  Teaching style and course details
  Generate Recommendations:

  Based on the retrieved information, generate a response that includes the top 3 professors who best match the user’s query. For each professor, include:
  Name
  Subject(s) they teach
  Average rating
  A brief description or highlight from their reviews
  Ensure Relevance and Accuracy:

  Verify that the recommendations are relevant to the user’s query and accurately reflect the professors’ qualifications and feedback.
  Format Response Clearly:

  Present the recommendations in a clear and concise format, making it easy for the user to understand and compare the options.
  Example User Queries and Responses:

  User Query:
  "I’m looking for a highly rated professor for introductory chemistry who is known for engaging lectures."

  Response:
  "Here are the top 3 professors for introductory chemistry based on your criteria:

  Dr. Emily Johnson
  Subject: Chemistry
  Rating: 5 stars
  Highlight: Dr. Johnson’s lectures are engaging and well-structured, with a clear understanding of complex topics.
  Prof. Michael Lee
  Subject: Chemistry
  Rating: 4.5 stars
  Highlight: Known for clear explanations and practical examples, although the pace might be fast for some students.
  Dr. Sarah Patel
  Subject: Chemistry
  Rating: 4 stars
  Highlight: Informative lectures with a good foundation, but could benefit from more interactive elements."
  User Query:
  "Can you recommend some professors who are known for their excellent teaching in computer science?"

  Response:
  "Here are the top 3 professors for computer science based on their teaching quality:

  Dr. John Smith
  Subject: Computer Science
  Rating: 4.5 stars
  Highlight: Well-structured classes with challenging projects, though feedback on assignments could be more detailed.
  Prof. Karen White
  Subject: Computer Science
  Rating: 4.3 stars
  Highlight: Clear explanations and practical approach, but some students find the workload heavy.
  Dr. Michael Thompson
  Subject: Computer Science
  Rating: 4 stars
  Highlight: Provides thorough understanding with real-world examples, though response to student questions could be improved."
  `

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  useEffect(() => {
    const initChat = async () => {
      try {
        const newChat = await genAI
          .getGenerativeModel({ model: MODEL_NAME })
          .startChat({
            generationConfig,
            safetySettings,
            history: [],
          });

        // console.log("New chat created:", newChat); // used to check if chat is correctly made
        setChat(newChat);

        const initialMessage = {
          role: "assistant",
          text: "Hi! I'm the Rate My Professor support assistant. How can I help you today?"
        };

        console.log("Initial message set:", initialMessage);
        setHistory([initialMessage]); 

      } catch (error) {
        console.error("Error initializing chat:", error);
        setError("Failed to initialize chat. Please try again.");
      }
    };

    initChat();
  }, []);

  // // TO TEST THE HISTORY
  // useEffect(() => {
  //   console.log("Updated history:", history);
  // }, [history]);

  const sendMessage = async () => {
    try {
      const userMessage = {
        text: message,
        role: 'user'
      };

      setHistory((prevMessages) => [...prevMessages, userMessage]);
      setMessage("");

      if (chat) {
        setLoading(true);

        const userInput = message.toLowerCase();
        const matchProfessors = professors
          .filter((professor) => {
            const subject = professor.subject.toLowerCase();
            const name = professor.professor.toLowerCase();
            return userInput.includes(subject) || userInput.includes(name);
          })
          // // INCORRECT FILTERING AS IT DOES NOT GET THE RIGHT INFO FROM REVIEWS.JSON
          // .filter((professor) => 
          //   professor.subject.toLowerCase().includes(userInput) || 
          //   professor.professor.toLowerCase().includes(userInput)
          // )
          .sort((a,b) => b.stars - a.stars)
          // sorting the stars
          .slice(0, 5);
          // to get the top 5

          const professorResult = matchProfessors.length > 0 ? 
            matchProfessors.map((professor) => `
              Professor: ${professor.professor}
              Subject: ${professor.subject}
              Rating: ${professor.stars} stars
              Review: ${professor.review}
            `).join("\n\n") : 
            "No professors found matching your request.";

        const prompt = `
          User Query: ${message}

          Relevant Professors based on your query:
          ${professorResult}

          Generate a response based on the user's query and the professor data above. Provide the best matches or suggest alternatives if no direct match is found.
        `;

        const result = await chat.sendMessage(prompt);
        const botMessage = {
          text: result.response.text(),
          role: 'assistant'
        };

        setHistory((prevMessages) => [...prevMessages, botMessage]);
      }
    } catch (error) {
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  // // attempt to change the text display, but replaced with react-markdown
  // const formatText = (text) => {
  //   const anyBold = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  //   const anyList = anyBold.replace(/\* (.*?)(?=\*|$)/g, '<li>$1</li>');
  //   return anyList;
  // }

  return (
    <Box width='100vw' height='100vh' display='flex' flexDirection='column' justifyContent='center' alignItems='center'>
      <Stack direction='column' width='500px' height='700px' border='1px solid black' p={2} spacing={3}>
        <Stack direction='column' spacing={2} flexGrow={1} overflow={'auto'} maxHeight={'100%'}>
        {
          history.map((msg, index) => (
            <Box
              key={index}
              display={'flex'}
              justifyContent={msg.role === 'assistant' ? 'flex-start' : 'flex-end'}
            >
              <Box
                bgcolor={msg.role === 'assistant' ? 'primary.main' : 'secondary.main'}
                color={'white'}
                borderRadius={10}
                p={2}
                // dangerouslySetInnerHTML={{ __html: formatText(msg.text)}}
              >
                <div padding='20px' margin='0 auto'>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
                {/* <div>{msg.text}</div> */}
              </Box>
            </Box>
          ))
        }
        {loading && (
            <Box><CircularProgress size={20} /></Box>
        )}
        </Stack>
        <Stack direction='row' spacing={2}>
          <TextField label='Message' fullWidth value={message} onChange={(e) => {
            setMessage(e.target.value)}}
            onKeyDown={handleKeyPress}/>
          <Button variant='contained' onClick={sendMessage}>
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>

  );
}


// //PREV IMPLEMENTATION OF SEND MESSAGE
// setHistory((messages)=> [
//   ...messages,
//   {role: 'user', content: message},
//   {role: 'assistant', content: ''}
// ])

// setMessage('')

// const response = fetch('/api/chat', {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json'
//   },
//   body: JSON.stringify([...messages, {role: 'user', content: message}])
// }).then(async(res)=> {
//   const reader = res.body.getReader()
//   const decoder = new TextDecoder()

//   let result = ''
//   return reader.read().then(function processText({done, value}){
//     if (done){
//       return result
//     }
//     const text = decoder.decode(value || new Uint8Array(), {stream: true})
//     setMessages((messages)=> {
//       let lastMessage = messages[messages.length - 1]
//       let otherMessages = messages.slice(0, messages.length - 1)
//       return [
//         ...otherMessages,
//         {...lastMessage, content: lastMessage.content + text},
//       ]
//     })

//     return reader.read().then(processText)
//   })
// })
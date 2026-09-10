import {
  useEffect,
  useState,
} from "react";

import {
  getProjectMessages,
} from "../../api/collaboration";

import {
  useProjectChat,
} from "../../hooks/useProjectChat";


export default function ProjectChat({
  projectId,
  currentUser,
  token,
}) {

  const [text, setText] = useState("");

  const [initialMessages, setInitialMessages] =
    useState([]);


  const {
    messages,
    sendMessage,
  } = useProjectChat(
    projectId,
    currentUser.id
  );


  useEffect(() => {

    async function loadMessages() {

      const data =
        await getProjectMessages(
          projectId,
          token
        );

      setInitialMessages(data);

    }


    loadMessages();

  }, [projectId, token]);


  const allMessages = [
    ...initialMessages,
    ...messages,
  ];


  const handleSend = () => {

    if (!text.trim()) {
      return;
    }


    sendMessage(text);


    setText("");

  };


  return (
    <div className="project-chat">

      <div className="chat-messages">

        {allMessages.map(
          (message) => (

            <div
              key={message.id}
              className="chat-message"
            >

              <strong>
                {message.user_name ||
                  message.user_id}
              </strong>

              <div>
                {message.content}
              </div>

              <small>
                {new Date(
                  message.created_at
                ).toLocaleTimeString()}
              </small>

            </div>

          )
        )}

      </div>


      <div className="chat-input">

        <input
          value={text}
          onChange={(event) =>
            setText(
              event.target.value
            )
          }
          onKeyDown={(event) => {

            if (
              event.key === "Enter"
            ) {
              handleSend();
            }

          }}
          placeholder="Write a message..."
        />


        <button
          onClick={handleSend}
        >
          Send
        </button>

      </div>

    </div>
  );
}
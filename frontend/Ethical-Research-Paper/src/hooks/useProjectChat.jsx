import {
  useEffect,
  useRef,
  useState,
} from "react";


export function useProjectChat(
  projectId,
  userId
) {
  const [messages, setMessages] = useState([]);

  const socketRef = useRef(null);


  useEffect(() => {

    if (!projectId || !userId) {
      return;
    }


    const socket = new WebSocket(
      `ws://localhost:8000/ws/projects/${projectId}?user_id=${userId}`
    );


    socketRef.current = socket;


    socket.onopen = () => {
      console.log(
        "Connected to project chat"
      );
    };


    socket.onmessage = (event) => {

      const data = JSON.parse(
        event.data
      );


      if (data.type === "message") {

        setMessages((previous) => [
          ...previous,
          data,
        ]);

      }

    };


    socket.onclose = () => {
      console.log(
        "Disconnected from project chat"
      );
    };


    socket.onerror = (error) => {
      console.error(
        "WebSocket error:",
        error
      );
    };


    return () => {
      socket.close();
    };

  }, [projectId, userId]);


  const sendMessage = (content) => {

    if (!socketRef.current) {
      return;
    }


    if (
      socketRef.current.readyState !==
      WebSocket.OPEN
    ) {
      return;
    }


    socketRef.current.send(
      JSON.stringify({
        content,
      })
    );

  };


  return {
    messages,
    sendMessage,
  };
}
const username = document.querySelector("#get-username").innerHTML;
const room = document.querySelector("#get-room").innerHTML;
const admin = document.querySelector("#get-admin").innerHTML;
const url = location.protocol + '//' + document.domain + ':' + location.port;
// Trigger 'join' event
var socket = io.connect(url);
function joinRoom(x) {

    // Join room
    socket.emit('join', {'username': username, 'room': x});
    // Clear message area
    document.querySelector('#display-message-section').innerHTML = '';

    // Autofocus on text box
    document.querySelector("#user_message").focus();
}
// Trigger 'leave' event if user was previously on a room
function leaveRoom() {
    socket.emit('leave', {'username': username, 'room': room});

    document.querySelectorAll('.select-room').forEach(p => {
        p.style.color = "black";
    });
}
document.addEventListener('DOMContentLoaded', () => {
    // Send messages
    joinRoom(room);
    document.querySelector('#show-sidebar-button').onclick = () => {
        document.querySelector('#sidebar').classList.toggle('view-sidebar');
    };
    let msg = document.getElementById("user_message");
    msg.addEventListener("keyup", function(event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            document.getElementById("send_message").click();
        }
    });
    document.querySelector('#send_message').onclick = function(){
        socket.emit('incoming-msg', {'msg': document.querySelector('#user_message').value,
            'username': username, 'room': room});
        document.querySelector('#user_message').value = '';
    };
    // Display all incoming messages
    socket.on('message', function(data){
        // Display current message
        if (data.msg!== undefined) {
            const p = document.createElement('p');
            const span_username = document.createElement('span');
            const span_timestamp = document.createElement('span');
            const br = document.createElement('br')
            // Display user's own message
            if (data.username == username) {
                    p.setAttribute("class", "my-msg");

                    // Username
                    span_username.setAttribute("class", "my-username");
                    span_username.innerText = data.username;

                    // Timestamp
                    span_timestamp.setAttribute("class", "timestamp");
                    span_timestamp.innerText = data.time_stamp;

                    // HTML to append
                    p.innerHTML += span_username.outerHTML + br.outerHTML + data.msg + br.outerHTML + span_timestamp.outerHTML

                    //Append
                    document.querySelector('#display-message-section').append(p);
            }
            // Display other users' messages
            else if (data.username !== undefined) {
                p.setAttribute("class", "others-msg");

                // Username
                span_username.setAttribute("class", "other-username");
                span_username.innerText = data.username;

                // Timestamp
                span_timestamp.setAttribute("class", "timestamp");
                span_timestamp.innerText = data.time_stamp;

                // HTML to append
                p.innerHTML += span_username.outerHTML + br.outerHTML + data.msg + br.outerHTML + span_timestamp.outerHTML;

                //Append
                document.querySelector('#display-message-section').append(p);
            }
            // Display system message
            else {
                printSysMsg(data.msg);
            }
            scrollDownChatWindow();
        }
        if((data.username!==undefined && data.admin!==undefined && data.room!==undefined)){
            if(document.querySelector('#get-username').innerHTML==admin) {
                document.getElementById("model_div").innerHTML=`${data.username} is requesting to join ${data.room}`;
                document.getElementById('request_person').innerHTML = data.username;
                person = data.username;
                $('#exampleModal').modal('show');
            }  
        }
    });

    document.getElementById("deny").onclick = ()=>{
        var p =document.getElementById('request_person').innerHTML;
        socket.emit("request_reply",{'username':p,"room":room,"answer":false});
        $('#exampleModal').modal('hide');
        person="";
    };

    document.getElementById("grant").onclick=()=>{
        var p =document.getElementById('request_person').innerHTML;
        socket.emit("request_reply",{"username":p,"room":room,"answer":true});
        $('#exampleModal').modal('hide');
    };

    document.getElementById("leave-btn").onclick = ()=>{
        console.log('leave room Triggered');
        leaveRoom();
        window.location = url+"/dashboard";
    }
    // Select a room
    document.querySelectorAll('.select-room').forEach(p => {
        p.onclick = () => {
            let newRoom = p.innerHTML;
            if (newRoom === room) {
                msg = `You are already in ${room} room.`;
                printSysMsg(msg);
            }
        };
    });

    // Logout from chat
    document.querySelector("#logout-btn").onclick = () => {
        leaveRoom();
    };


    // Scroll chat window down
    function scrollDownChatWindow() {
        const chatWindow = document.querySelector("#display-message-section");
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // Print system messages
    function printSysMsg(msg) {
        const p = document.createElement('p');
        p.setAttribute("class", "system-msg");
        p.innerHTML = msg;
        document.querySelector('#display-message-section').append(p);
        scrollDownChatWindow()

        // Autofocus on text box
        document.querySelector("#user_message").focus();
    }
});

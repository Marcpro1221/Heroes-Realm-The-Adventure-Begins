window.addEventListener('keydown',(event)=>{
    switch(event.key){
        case 'w':
            if(character.velocity.y === 0){character.velocity.y = -10} 
            break;
        case 'd':
            key.d.pressed = true;
            break;
        case 'a':
            key.a.pressed = true;   
            break;   
    }
    console.log(event.key);
});
window.addEventListener('keyup',(event)=>{
    switch(event.key){
        case 'd':
            key.d.pressed = false;
            break;
        case 'a':
            key.a.pressed = false;      
    }
    console.log(event.key);
});
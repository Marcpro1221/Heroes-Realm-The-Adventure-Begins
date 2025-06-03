
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let character = new Character(75, 75, canvas.width, canvas.height); // 75 is height and width of character

const key = {
    w :{
        pressed : false
    },
    a :{
        pressed : false
    },
    d :{
        pressed : false
    }

};
function animate(){
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    character.draw(ctx);
    character.update();

    character.velocity.x = 0;
    if(key.a.pressed){
        character.velocity.x = -5;
    }else if(key.d.pressed){
        character.velocity.x = 5;
        //console.log(character.position.x);
    }

}
animate();

/*
1. Understand velocity and position y
2. keypress event & different keypress or keyrelease
3. left and right movement
*/
 class Character{
    constructor(height, width, canvasWidth, canvasHeight){
        this.position={
            x:150, // initial x position of character
            y:450 // initial y position of character
        };
        this.height = height;
        this.width = width;
        this.canvasHeight = canvasHeight;
        this.canvasWidth = canvasWidth
        this.velocity = {
            x: 0,
            y: 0
        }
        this.sides = {
            bottom : this.position.y + this.height, // y450 + h75 = 525
            side : this.position.x + this.width
        }
        this.gravity = 1;
    }
    draw(ctx){ // draw the character
        ctx.fillStyle = 'red';
        ctx.fillRect(this.position.x, this.position.y, this.height, this.width);
    }
    update(){
        // checking for left and right collision
        this.sides.side = this.position.x + this.width;
        if(this.sides.side + this.velocity.x >= this.canvasWidth || this.position.x + this.velocity.x < 0){
            console.log('side: ', this.position.x + this.width);
            this.velocity.x = 0;
        }
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.sides.bottom = this.position.y + this.height;  
        if(this.sides.bottom + this.velocity.y < this.canvasHeight){
            this.velocity.y += this.gravity; 
            
        }else this.velocity.y = 0;

        
    }

}
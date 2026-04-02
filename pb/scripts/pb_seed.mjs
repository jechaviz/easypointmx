const PB_URL = 'http://127.0.0.1:8090';

async function seed() {
  const p1 = await (await fetch(PB_URL+'/api/collections/points/records', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:'Punto CDMX Centro',address:'Av. Juárez 14',active:true})
  })).json();
  
  const p2 = await (await fetch(PB_URL+'/api/collections/points/records', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:'Locker Roma Exprés',address:'Obregón 201',active:true})
  })).json();

  await fetch(PB_URL+'/api/collections/shipments/records', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({tracking_id:'MXL001',status:'pending',point_id:p1.id})
  });
  
  await fetch(PB_URL+'/api/collections/shipments/records', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({tracking_id:'MXL002',status:'in_transit',point_id:p1.id})
  });
  
  await fetch(PB_URL+'/api/collections/shipments/records', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({tracking_id:'MXL003',status:'pending',point_id:p2.id})
  });
  
  console.log('Seed completed.');
}

seed().catch(console.error);

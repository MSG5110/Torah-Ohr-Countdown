type URLAPI = {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
};
type Resource = { blob: Blob; url: string; owners: number };
export class PhotoURLPool {
  private blobs = new Map<Blob, Resource>();
  private urls = new Map<string, Resource>();
  constructor(private api: URLAPI = URL) {}
  acquire(blob: Blob) {
    let resource = this.blobs.get(blob);
    if (!resource) {
      resource = { blob, url: this.api.createObjectURL(blob), owners: 0 };
      this.blobs.set(blob, resource);
      this.urls.set(resource.url, resource);
    }
    return this.lease(resource);
  }
  retain(url: string) {
    const resource = this.urls.get(url);
    return resource ? this.lease(resource).release : () => {};
  }
  private lease(resource: Resource) {
    resource.owners++;
    let released = false;
    return {
      url: resource.url,
      release: () => {
        if (released) return;
        released = true;
        if (--resource.owners === 0) {
          this.api.revokeObjectURL(resource.url);
          this.blobs.delete(resource.blob);
          this.urls.delete(resource.url);
        }
      },
    };
  }
  get size() {
    return this.urls.size;
  }
}
export const photoURLs = new PhotoURLPool();

export function acquirePhoto(photo: {blob:Blob;thumbnail?:Blob;remoteUrl?:string;thumbnailUrl?:string},thumbnail=false){
 const remote=thumbnail?(photo.thumbnailUrl??photo.remoteUrl):photo.remoteUrl;
 return remote?{url:remote,release:()=>{}}:photoURLs.acquire(thumbnail?(photo.thumbnail??photo.blob):photo.blob);
}
